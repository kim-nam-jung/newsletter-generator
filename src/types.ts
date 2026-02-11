export type BlockType = 'text' | 'image' | 'placeholder';

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
}

export interface PlaceholderBlock extends BaseBlock {
  type: 'placeholder';
}

export type Block = TextBlock | ImageBlock | PlaceholderBlock;

export interface NewsletterSummary {
  id: string;
  title: string;
  updatedAt: number;
}
