
export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  isVideo?: boolean; // 新增：标记是否为视频文件
}

export interface StitchResult {
  blob?: Blob; // 纯前端模式用到
  url: string; // 主要是预览图(JPG)的URL
  movUrl?: string; // 后端模式：视频下载地址
  jpgUrl?: string; // 后端模式：图片下载地址
  width: number;
  height: number;
  isLivePhoto?: boolean; // 标记是否为实况照片模式结果
}

// Declaration for the global piexif object loaded via CDN
declare global {
  interface Window {
    piexif: any;
  }
}
