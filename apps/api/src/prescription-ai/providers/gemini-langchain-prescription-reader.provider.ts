import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrescriptionReader, PrescriptionReaderInput } from './prescription-reader.interface';
import { PrescriptionExtractionResultDTO } from '@pharmacy/shared-types';
import {
  PrescriptionExtractionResultZodSchema,
  validatePrescriptionExtraction,
} from '@pharmacy/validation';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage } from '@langchain/core/messages';
import { PDFDocument } from 'pdf-lib';

const EXTRACTION_SYSTEM_PROMPT = `You are a specialized medical document reader for prescription digitization.
Follow these critical rules with absolute strictness:
1. Read printed and handwritten prescription content from the document.
2. Extract only information explicitly visible in the document.
3. Preserve uncertain text in rawMedicineName rather than guessing.
4. Identify each medicine separately.
5. Extract strength, dosage form, instructions, frequency, duration, and quantity independently.
6. Return null for fields that cannot be clearly read.
7. Report unreadable portions in unreadableSections.
8. Avoid providing medical advice, diagnoses, treatment recommendations, or dosage corrections.
9. Never decide whether a medicine can legally be sold or whether the prescription is legally valid.
10. If the document is blurred, obscured, or illegible, set documentReadable: false, overallConfidence: low, and empty or partially extracted items.
11. Never fabricate details. If the patient name or doctor name is missing, return null.
12. Return dates in ISO YYYY-MM-DD format if readable, otherwise null.`;

@Injectable()
export class GeminiLangChainPrescriptionReader implements PrescriptionReader, OnModuleInit {
  private readonly logger = new Logger(GeminiLangChainPrescriptionReader.name);
  private model!: ChatGoogleGenerativeAI;
  private structuredLlm: any;
  private geminiApiKey!: string;
  private geminiModel!: string;
  private providerConfig!: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.providerConfig = this.configService.get<string>('prescriptionAi.provider', 'mock');
    this.geminiApiKey = this.configService.get<string>('prescriptionAi.geminiApiKey', '');
    this.geminiModel = this.configService.get<string>(
      'prescriptionAi.geminiModel',
      'gemini-2.5-flash',
    );

    if (this.providerConfig === 'gemini') {
      if (!this.geminiApiKey || this.geminiApiKey.trim() === '') {
        throw new Error(
          'FATAL: GEMINI_API_KEY must be configured when PRESCRIPTION_AI_PROVIDER is set to "gemini"! Startup aborted.',
        );
      }

      this.model = new ChatGoogleGenerativeAI({
        model: this.geminiModel,
        apiKey: this.geminiApiKey,
        temperature: 0,
      });

      this.structuredLlm = this.model.withStructuredOutput(PrescriptionExtractionResultZodSchema);

      this.logger.log(`Initialized Gemini LangChain provider with model: ${this.geminiModel}`);
    }
  }

  async extract(input: PrescriptionReaderInput): Promise<PrescriptionExtractionResultDTO> {
    if (this.providerConfig !== 'gemini' || !this.structuredLlm) {
      throw new Error(
        'Gemini provider is not configured. Set PRESCRIPTION_AI_PROVIDER=gemini and provide GEMINI_API_KEY.',
      );
    }

    // Document validation: enforce prescription upload limits
    if (input.mimeType === 'application/pdf') {
      try {
        const pdfDoc = await PDFDocument.load(input.buffer);
        const pageCount = pdfDoc.getPageCount();
        if (pageCount > 10) {
          throw new BadRequestException(
            `Prescription PDF exceeds maximum limit of 10 pages (found ${pageCount} pages).`,
          );
        }
      } catch (err: any) {
        if (err instanceof BadRequestException) throw err;
        throw new BadRequestException('Invalid or corrupted PDF prescription file.');
      }
    }

    const base64Data = input.buffer.toString('base64');
    const dataUrl = `data:${input.mimeType};base64,${base64Data}`;

    const humanMessage = new HumanMessage({
      content: [
        {
          type: 'text',
          text: EXTRACTION_SYSTEM_PROMPT,
        },
        {
          type: 'image_url',
          image_url: dataUrl,
        },
      ],
    });

    try {
      this.logger.log(
        `Invoking LangChain Gemini multimodal extraction (model: ${this.geminiModel}, mime: ${input.mimeType}, attempt: ${input.attemptNumber})`,
      );
      const rawResult = await this.structuredLlm.invoke([humanMessage]);

      const validated = validatePrescriptionExtraction(rawResult);
      if (!validated.valid || !validated.data) {
        this.logger.error(
          `Gemini extraction failed schema validation: ${validated.errors.join('; ')}`,
        );
        throw new Error(`AI output validation failed: ${validated.errors.slice(0, 3).join(', ')}`);
      }

      return validated.data as PrescriptionExtractionResultDTO;
    } catch (err: any) {
      this.logger.error(
        `Gemini LangChain extraction failed for ${input.originalFileName}: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }
}
