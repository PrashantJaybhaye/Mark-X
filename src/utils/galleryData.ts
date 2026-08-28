export interface GalleryPin {
  id: string;
  title?: string;
  domain?: string;
  author: string;
  authorAvatar?: string;
  imageUrl: string;
  aspectRatio: number; // width / height (e.g. 0.65 to 1.3)
  category: string;
  likes: number;
  isLiked?: boolean;
  saved?: boolean;
  tags?: string[];
  description?: string;
}

export const GALLERY_CATEGORIES = [
  "All",
  "Floral",
  "Blue",
  "Aesthetic",
  "Fashion",
  "Objects",
  "Minimal",
  "Architecture",
] as const;

export const INITIAL_GALLERY_PINS: GalleryPin[] = [];
