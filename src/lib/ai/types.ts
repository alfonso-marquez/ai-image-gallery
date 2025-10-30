export interface AIProvider {
  name: string;
  analyzeTags(imageBuffer: Buffer): Promise<string[]>;
  analyzeColors(imageBuffer: Buffer): Promise<string[]>;
  generateDescription(tags: string[]): Promise<string>;
}

export interface AIAnalysisResult {
  tags: string[];
  colors: string[];
  description: string;
  provider: string;
}

export interface AIProviderConfig {
  tagsProvider: string;
  colorsProvider: string;
  descriptionProvider: string;
}
