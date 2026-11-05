import { Injectable, Logger } from '@nestjs/common';
import {
  PrescriptionReader,
  PrescriptionReaderInput,
} from './prescription-reader.interface';
import { PrescriptionExtractionResultDTO } from '@pharmacy/shared-types';

@Injectable()
export class MockPrescriptionReader implements PrescriptionReader {
  private readonly logger = new Logger(MockPrescriptionReader.name);

  async extract(input: PrescriptionReaderInput): Promise<PrescriptionExtractionResultDTO> {
    const hint = (
      input.fixtureHint ||
      input.originalFileName ||
      ''
    ).toLowerCase();

    // 6. Provider failure simulation
    if (hint.includes('failure') || hint.includes('fail') || hint.includes('error')) {
      if (input.attemptNumber === 1) {
        this.logger.warn(
          `[MockPrescriptionReader] Simulating transient provider failure on attempt ${input.attemptNumber}`,
        );
        throw new Error('AI provider connection timeout (simulated transient failure)');
      }
      this.logger.log(
        `[MockPrescriptionReader] Simulated failure recovery on attempt ${input.attemptNumber}`,
      );
    }

    // 5. Unreadable prescription
    if (hint.includes('unreadable') || hint.includes('blur') || hint.includes('illegible')) {
      return {
        documentReadable: false,
        overallConfidence: 0.18,
        patientName: null,
        prescriberName: null,
        prescriptionDate: null,
        items: [],
        unreadableSections: [
          'Handwritten doctor notes are heavily blurred and illegible',
          'Rx medicine lines could not be reliably resolved',
        ],
        generalWarnings: [
          'Document clarity is insufficient for reliable extraction. Please upload a clear photo or high-resolution scan.',
        ],
      };
    }

    // 3. Ambiguous handwriting
    if (hint.includes('ambiguous') || hint.includes('unclear')) {
      return {
        documentReadable: true,
        overallConfidence: 0.52,
        patientName: 'R. Sharma',
        prescriberName: 'Dr. S. K. Roy',
        prescriptionDate: '2026-11-01',
        items: [
          {
            rawMedicineName: 'Metformin',
            normalizedMedicineName: 'Metformin',
            strength: null, // Missing explicit strength creates ambiguity
            dosageForm: 'Tablet',
            dosageInstructions: '1 tab daily with breakfast',
            frequency: 'Once daily',
            duration: '30 days',
            quantity: 30,
            confidence: 0.55,
            sourceText: 'Tab Metformin 1 OD with breakfast x 30 days',
            warnings: ['Strength not explicitly specified on prescription'],
          },
        ],
        unreadableSections: ['Prescription header contact details slightly cropped'],
        generalWarnings: ['Ambiguous dosage or strength detected. Requires pharmacist review.'],
      };
    }

    // 4. Unmatched medicine
    if (hint.includes('unmatched') || hint.includes('unknown') || hint.includes('notfound')) {
      return {
        documentReadable: true,
        overallConfidence: 0.88,
        patientName: 'Amit Verma',
        prescriberName: 'Dr. V. Rao',
        prescriptionDate: '2026-11-03',
        items: [
          {
            rawMedicineName: 'Cefuroxime Axetil 500 mg',
            normalizedMedicineName: 'Cefuroxime Axetil',
            strength: '500 mg',
            dosageForm: 'Tablet',
            dosageInstructions: '1 tablet twice daily after meals',
            frequency: 'Twice daily',
            duration: '5 days',
            quantity: 10,
            confidence: 0.91,
            sourceText: 'Tab Cefuroxime Axetil 500mg BD pc x 5d',
            warnings: [],
          },
        ],
        unreadableSections: [],
        generalWarnings: [],
      };
    }

    // 2. Readable prescription with multiple medicines
    if (hint.includes('multi') || hint.includes('multiple')) {
      return {
        documentReadable: true,
        overallConfidence: 0.95,
        patientName: 'Debasish Ghosh',
        prescriberName: 'Dr. A. K. Banerjee (Reg. 45892)',
        prescriptionDate: '2026-11-04',
        items: [
          {
            rawMedicineName: 'Metformin 500 mg',
            normalizedMedicineName: 'Metformin',
            strength: '500 mg',
            dosageForm: 'Tablet',
            dosageInstructions: '1 tablet twice daily after food',
            frequency: 'Twice daily',
            duration: '30 days',
            quantity: 30,
            confidence: 0.96,
            sourceText: 'Tab. Metformin 500mg 1 tab BD after food #30',
            warnings: [],
          },
          {
            rawMedicineName: 'Amoxicillin 500 mg',
            normalizedMedicineName: 'Amoxicillin',
            strength: '500 mg',
            dosageForm: 'Capsule',
            dosageInstructions: '1 capsule three times daily for 5 days',
            frequency: 'Thrice daily',
            duration: '5 days',
            quantity: 15,
            confidence: 0.94,
            sourceText: 'Cap. Amoxicillin 500mg TDS x 5 days #15',
            warnings: [],
          },
        ],
        unreadableSections: [],
        generalWarnings: [],
      };
    }

    // 1. Default Readable prescription: Metformin 500 mg, quantity 4, matched to catalogue
    return {
      documentReadable: true,
      overallConfidence: 0.96,
      patientName: 'Debasish Ghosh',
      prescriberName: 'Dr. A. K. Banerjee (Reg. 45892)',
      prescriptionDate: '2026-11-04',
      items: [
        {
          rawMedicineName: 'Metformin 500 mg',
          normalizedMedicineName: 'Metformin',
          strength: '500 mg',
          dosageForm: 'Tablet',
          dosageInstructions: '1 tablet once daily after breakfast',
          frequency: 'Once daily',
          duration: '4 days',
          quantity: 4,
          confidence: 0.96,
          sourceText: 'Tab. Metformin 500 mg - 1 OD morning pc - Qty: 4',
          warnings: [],
        },
      ],
      unreadableSections: [],
      generalWarnings: [],
    };
  }
}
