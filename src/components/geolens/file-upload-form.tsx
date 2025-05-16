
"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import type { GenerateBiasReportInput } from "@/ai/flows/generate-bias-report";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_MIME_TYPES = [
  "application/json", // For JSON
  "application/geo+json", // Standard for GeoJSON
  "text/csv", // Standard for CSV
  "application/vnd.ms-excel", // Sometimes used for CSV
];
const ACCEPTED_EXTENSIONS = [".geojson", ".json", ".csv"];


const formSchema = z.object({
  geoFile: z
    .instanceof(File, { message: "Geospatial data file is required." })
    .refine((file) => file.size > 0, "File cannot be empty.")
    .refine(
      (file) => file.size <= MAX_FILE_SIZE_BYTES,
      `Max file size is ${MAX_FILE_SIZE_MB}MB.`
    )
    .refine((file) => {
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      return ACCEPTED_MIME_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(fileExtension);
    }, "Unsupported file type. Please upload a CSV or GeoJSON file."),
  datasetDescription: z
    .string()
    .min(10, "Description must be at least 10 characters long.")
    .max(500, "Description must be at most 500 characters long."),
});

export type FileUploadFormValues = z.infer<typeof formSchema>;

interface FileUploadFormProps {
  onFormSubmit: (data: GenerateBiasReportInput) => Promise<void>;
  isLoading: boolean;
}

// Helper to convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const readFileAsDataURI = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const base64Data = arrayBufferToBase64(arrayBuffer);
      
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      let mimeType: string;

      if (fileExtension === ".geojson" || fileExtension === ".json") {
        mimeType = "application/json";
      } else if (fileExtension === ".csv") {
        mimeType = "text/csv";
      } else {
        // This case should ideally not be reached due to form validation
        // If it is, reject to prevent sending unsupported types
        reject(new Error(`Cannot determine a supported MIME type for file extension: ${fileExtension}`));
        return;
      }
      
      resolve(`data:${mimeType};base64,${base64Data}`);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file); // Read as ArrayBuffer to manually construct data URI
  });
};

export function FileUploadForm({
  onFormSubmit,
  isLoading,
}: FileUploadFormProps) {
  const form = useForm<FileUploadFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      datasetDescription: "",
    },
  });

  const onSubmit: SubmitHandler<FileUploadFormValues> = async (data) => {
    try {
      const geoDataUri = await readFileAsDataURI(data.geoFile);
      await onFormSubmit({
        geoData: geoDataUri,
        datasetDescription: data.datasetDescription,
      });
    } catch (error) {
      console.error("Error processing file or submitting form:", error);
      let message = "Could not read file or an unknown error occurred.";
      if (error instanceof Error) {
        message = error.message;
      }
      form.setError("geoFile", { type: "manual", message });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="geoFile"
          render={({ field: { onChange, value, ...rest } }) => (
            <FormItem>
              <FormLabel htmlFor="geoFile">Geospatial Data File (CSV/GeoJSON)</FormLabel>
              <FormControl>
                <Input
                  id="geoFile"
                  type="file"
                  accept=".csv,.json,.geojson,application/json,application/geo+json,text/csv"
                  onChange={(e) => {
                    onChange(e.target.files ? e.target.files[0] : null);
                  }}
                  {...rest}
                  className="py-2 px-3 h-auto"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="datasetDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="datasetDescription">Dataset Description</FormLabel>
              <FormControl>
                <Textarea
                  id="datasetDescription"
                  placeholder="Describe your dataset, its source, and any known characteristics..."
                  {...field}
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Report...
            </>
          ) : (
            "Generate Bias Report"
          )}
        </Button>
      </form>
    </Form>
  );
}
