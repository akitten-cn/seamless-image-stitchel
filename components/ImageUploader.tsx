
import React, { useRef, useState } from 'react';
import { UploadCloud, FileVideo, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onFilesSelected: (files: File[]) => void;
  mode: 'client' | 'server';
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onFilesSelected, mode }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFiles = (files: File[]) => {
    if (mode === 'server') {
      // 在实况模式下，接受图片和视频
      onFilesSelected(files);
    } else {
      // 纯前端模式只接受图片
      const validImages = files.filter(file => file.type.startsWith('image/'));
      if (validImages.length > 0) {
        onFilesSelected(validImages);
      } else {
        alert("纯图拼接模式仅支持图片文件。");
      }
    }
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer bg-white
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        multiple
        accept={mode === 'server' ? "image/*,video/*,.heic,.mov,.mp4" : "image/*"}
        className="hidden"
      />
      
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className={`p-4 rounded-full ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
          {mode === 'server' ? <FileVideo size={32} /> : <UploadCloud size={32} />}
        </div>
        <div>
          <p className="text-lg font-medium text-slate-900">
            {mode === 'server' ? '点击或拖拽 实况照片 (推荐上传视频文件)' : '点击或拖拽图片到这里'}
          </p>
          <div className="text-sm text-slate-500 mt-1 space-y-1">
            {mode === 'server' ? (
              <>
                 <p className="font-medium text-orange-600">⚠️ 重要提示：</p>
                 <p>若直接选择“实况照片”，浏览器可能只会上传静态图片，导致没有声音。</p>
                 <p>若需保留声音，请在相册中先<strong>“存储到文件”</strong>，然后在此处选择该视频文件。</p>
              </>
            ) : (
              '支持 JPG, PNG, WebP。支持多图上传。'
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
