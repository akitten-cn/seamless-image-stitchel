import { UploadedImage, StitchResult } from '../types';

/**
 * 将文件加载到 HTMLImageElement 以获取尺寸和原始数据。
 */
const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      // URL.revokeObjectURL(url); // 保持活跃以便绘制
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
};

/**
 * 将文件读取为 DataURL 字符串 (Base64)。
 */
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * 垂直拼接图片的主函数。
 */
export const stitchImages = async (uploadedImages: UploadedImage[]): Promise<StitchResult> => {
  if (uploadedImages.length === 0) {
    throw new Error("没有可拼接的图片");
  }

  // 1. 加载所有图片为有效的 HTMLImageElements
  const loadedImages = await Promise.all(uploadedImages.map(u => loadImage(u.file)));
  
  // 2. 计算尺寸
  // 策略：将所有内容缩放到第一张图片的宽度以保持一致性。
  // 这对于“屏幕截图拼接”来说是很典型的做法。
  const targetWidth = loadedImages[0].naturalWidth;
  
  let totalHeight = 0;
  
  // 根据缩放后的尺寸计算所需的总高度
  const imageDrawData = loadedImages.map(img => {
    const scaleFactor = targetWidth / img.naturalWidth;
    const scaledHeight = img.naturalHeight * scaleFactor;
    totalHeight += scaledHeight;
    return {
      img,
      scaledHeight,
      scaleFactor
    };
  });

  // 3. 创建画布
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error("无法获取画布上下文");

  // 填充白色背景（可选，防止透明度问题）
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 4. 绘制图片
  let currentY = 0;
  imageDrawData.forEach(({ img, scaledHeight }) => {
    ctx.drawImage(img, 0, currentY, targetWidth, scaledHeight);
    currentY += scaledHeight;
  });

  // 5. 获取 Data URL (JPEG, 质量 1.0)
  // 我们使用 JPEG 是因为 EXIF 通常在 JPEG 中受支持。
  // Piexifjs 适用于 JPEG DataURLs。
  const stitchedDataUrl = canvas.toDataURL("image/jpeg", 1.0);

  // 6. 处理 EXIF
  let finalDataUrl = stitchedDataUrl;
  
  try {
    // 读取第一张图片以获取其 EXIF
    const firstImageDataUrl = await readFileAsDataURL(uploadedImages[0].file);
    
    // 检查 window.piexif 是否存在（通过 index.html 中的 CDN 加载）
    if (window.piexif) {
      try {
        // 尝试从第一张图片加载 EXIF
        const exifObj = window.piexif.load(firstImageDataUrl);
        
        // 如果 EXIF 存在，将其注入到新图片中
        // '0th', 'Exif', 'GPS', 'Interop', '1st' 是 exifObj 中的键
        if (typeof exifObj === 'object') {
             // 有时 load 对空内容返回 "null" 字符串表示
             const exifBytes = window.piexif.dump(exifObj);
             finalDataUrl = window.piexif.insert(exifBytes, stitchedDataUrl);
             console.log("EXIF 数据已成功传输。");
        }
      } catch (exifError) {
        console.warn("无法提取或插入 EXIF 数据（图片可能是 PNG 或没有 EXIF）:", exifError);
        // 降级处理：仅使用没有 EXIF 的拼接图片
      }
    } else {
      console.warn("未找到 Piexifjs。将不会保留 EXIF 数据。");
    }
  } catch (err) {
    console.error("处理 EXIF 时出错:", err);
  }

  // 7. 转换为 Blob 用于下载链接
  const res = await fetch(finalDataUrl);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  // 清理
  loadedImages.forEach(img => URL.revokeObjectURL(img.src));

  return {
    blob,
    url,
    width: targetWidth,
    height: Math.round(totalHeight)
  };
};