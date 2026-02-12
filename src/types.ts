export type BlockType = 'text' | 'image' | 'placeholder' | 'html' | 'pdf';

export interface LinkInfo {
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BaseBlock {
  id: string;
  type: BlockType;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  content: string;
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  src: string;
  alt?: string;
  link?: string;
  links?: LinkInfo[];  // PDF에서 추출된 오버레이 링크들
  width?: number;
  height?: number;
}

export interface PlaceholderBlock extends BaseBlock {
  type: 'placeholder';
}

export interface HtmlBlock extends BaseBlock {
  type: 'html';
  content: string;
  pageIndex?: number;
}

export interface PdfBlock extends BaseBlock {
  type: 'pdf';
  src: string;        // URL of the Page Image (converted from PDF)
  content?: string;   // HTML string of the TextLayer
  links?: LinkInfo[]; // Link coordinates
  width?: number;     // Page width
  height?: number;    // Page height
}

export type Block = TextBlock | ImageBlock | PlaceholderBlock | HtmlBlock | PdfBlock;

export interface NewsletterSummary {
  id: string;
  title: string;
  updatedAt: number;
}
