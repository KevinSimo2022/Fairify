// src/ai/flows/generate-bias-report.ts
'use server';

/**
 * @fileOverview A flow for generating a bias report from geospatial data.
 *
 * - generateBiasReport - A function that handles the generation of a bias report.
 * - GenerateBiasReportInput - The input type for the generateBiasReport function.
 * - GenerateBiasReportOutput - The return type for the generateBiasReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBiasReportInputSchema = z.object({
  geoData: z
    .string()
    .describe(
      'The geospatial data as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'    ),
  datasetDescription: z.string().describe('A description of the geospatial dataset.'),
});
export type GenerateBiasReportInput = z.infer<typeof GenerateBiasReportInputSchema>;

const GenerateBiasReportOutputSchema = z.object({
  coverageStatistics: z.string().describe('Statistics about the coverage of the dataset.'),
  giniCoefficient: z.number().describe('The Gini coefficient of the dataset.'),
  fairnessMetrics: z.string().describe('Fairness metrics for the dataset.'),
  potentialBiases: z.string().describe('A description of potential biases in the dataset.'),
});
export type GenerateBiasReportOutput = z.infer<typeof GenerateBiasReportOutputSchema>;

export async function generateBiasReport(input: GenerateBiasReportInput): Promise<GenerateBiasReportOutput> {
  return generateBiasReportFlow(input);
}

const generateBiasReportPrompt = ai.definePrompt({
  name: 'generateBiasReportPrompt',
  input: {schema: GenerateBiasReportInputSchema},
  output: {schema: GenerateBiasReportOutputSchema},
  prompt: `You are an expert in geospatial data analysis and fairness metrics. You will analyze the
provided geospatial dataset and generate a comprehensive bias report. The report should include coverage statistics,
Gini coefficient, fairness metrics, and a description of potential biases. Make sure to include the units in the
coverage statistics, Gini coefficient, and fairness metrics.

Dataset Description: {{{datasetDescription}}}
Geospatial Data: {{media url=geoData}}`,
});

const generateBiasReportFlow = ai.defineFlow(
  {
    name: 'generateBiasReportFlow',
    inputSchema: GenerateBiasReportInputSchema,
    outputSchema: GenerateBiasReportOutputSchema,
  },
  async input => {
    const {output} = await generateBiasReportPrompt(input);
    return output!;
  }
);
