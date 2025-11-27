
import React, { useState, useCallback, useEffect } from 'react';
import { UploadedImage, StitchResult } from './types';
import { ImageUploader } from './components/ImageUploader';
import { Button } from './components/Button';
import { stitchImages } from './services/imageService';
import { Trash2, Download, ArrowDown, MoveUp, MoveDown, Info, Image as ImageIcon, Video, Server, Smartphone, ExternalLink } from 'lucide-react';

const App: React.FC = () => {
  // 默认为 server 模式，因为用户主要需求是实况拼接
  const [mode, setMode] = useState<'client' | 'server'>('server');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<StitchResult | null>(null);
  const [backendUrl, setBackendUrl] = useState("http://localhost:8000");

  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.previewUrl));
      if (result && result.blob) URL.revokeObjectURL(result.url);
    };
  }, []);

  const handleFilesSelected = (files: File[]) => {
    const newImages: UploadedImage[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      previewUrl: URL.createObjectURL(file),
      width: 0, 
      height: 0,
      isVideo: file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mov') || file.name.toLowerCase().endsWith('.mp4')
    }));

    // 实况模式下，文件按名称排序
    const combined = [...images, ...newImages];
    if (mode === 'server') {
       combined.sort((a, b) => a.file.name.localeCompare(b.file.name));
    }
    
    setImages(combined);
    setResult(null); 
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter(i => i.id !== id);
    });
    setResult(null);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === images.length - 1)
    ) return;

    const newImages = [...images];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
    setImages(newImages);
    setResult(null);
  };

  const handleStitch = async () => {
    if (images.length === 0) return;
    
    setIsProcessing(true);
    setResult(null);

    try {
      if (mode === 'client') {
        setTimeout(async () => {
          try {
            const res = await stitchImages(images);
            setResult(res);
          } catch (error) {
            console.error(error);
            alert("图片拼接失败，请重试。");
          } finally {
            setIsProcessing(false);
          }
        }, 100);
      } else {
        const formData = new FormData();
        images.forEach(img => {
          formData.append('files', img.file);
        });

        try {
          const response = await fetch(`${backendUrl}/stitch-live`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`后端错误: ${errText}`);
          }

          const data = await response.json();
          
          if (data.status === 'success') {
            setResult({
              url: `${backendUrl}${data.jpg_url}`, // 预览图 URL
              jpgUrl: `${backendUrl}${data.jpg_url}`,
              movUrl: `${backendUrl}${data.mov_url}`,
              width: data.width,
              height: data.height,
              isLivePhoto: true
            });
          } else {
             throw new Error("未知响应格式");
          }
        } catch (error: any) {
          console.error(error);
          alert(`请求后端失败: ${error.message}\n请确保本地后端已启动 (python main.py)`);
        } finally {
          setIsProcessing(false);
        }
      }
    } catch (error) {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    
    if (result.isLivePhoto && result.jpgUrl && result.movUrl) {
        // 实况照片下载逻辑：同时下载 JPG 和 MOV
        alert("正在下载... \n请务必将两个文件（JPG和MOV）都保存到相册，系统会自动合并它们为实况照片。");
        
        // 创建下载链接下载 JPG
        const linkJpg = document.createElement('a');
        linkJpg.href = result.jpgUrl;
        linkJpg.download = `Live_Stitched_${new Date().getTime()}.jpg`;
        document.body.appendChild(linkJpg);
        linkJpg.click();
        document.body.removeChild(linkJpg);
        
        // 延迟一下下载 MOV，防止浏览器拦截
        setTimeout(() => {
            const linkMov = document.createElement('a');
            linkMov.href = result.movUrl!;
            linkMov.download = `Live_Stitched_${new Date().getTime()}.mov`;
            document.body.appendChild(linkMov);
            linkMov.click();
            document.body.removeChild(linkMov);
        }, 500);

    } else {
        // 普通图片下载
        const link = document.createElement('a');
        link.href = result.url;
        link.download = `stitched-image-${new Date().getTime()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  const clearAll = () => {
    if(confirm("确定要移除所有文件吗？")) {
        images.forEach(img => URL.revokeObjectURL(img.previewUrl));
        setImages([]);
        setResult(null);
    }
  };

  const toggleMode = () => {
    if (images.length > 0) {
      if (!confirm("切换模式将清空当前文件列表，是否继续？")) return;
      clearAll();
    }
    setMode(prev => prev === 'client' ? 'server' : 'client');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <div className="bg-blue-600 p-1.5 rounded-lg">
                <ArrowDown className="text-white h-5 w-5" />
             </div>
             <h1 className="text-xl font-bold text-gray-900 hidden sm:block">实况长图拼接工具</h1>
             <h1 className="text-xl font-bold text-gray-900 sm:hidden">实况拼接</h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
             <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                  onClick={() => mode !== 'server' && toggleMode()}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center ${mode === 'server' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Smartphone size={14} className="mr-1.5" />
                  实况模式
                </button>
                <button 
                  onClick={() => mode !== 'client' && toggleMode()}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center ${mode === 'client' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <ImageIcon size={14} className="mr-1.5" />
                  纯图模式
                </button>
             </div>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {mode === 'server' && (
          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4 flex flex-col sm:flex-row items-start gap-3 text-sm text-blue-800">
             <Server className="mt-0.5 flex-shrink-0" size={18} />
             <div className="flex-grow">
                <p className="font-bold mb-1">正在使用实况照片模式</p>
                <p>需要启动本地 Python 后端。生成的照片将包含第一张实况照片的声音。</p>
                <div className="mt-2 flex items-center gap-2">
                   <label className="text-xs font-semibold uppercase text-blue-600">API 地址:</label>
                   <input 
                     type="text" 
                     value={backendUrl} 
                     onChange={(e) => setBackendUrl(e.target.value)}
                     className="px-2 py-1 rounded border border-blue-200 text-xs w-48 focus:outline-none focus:border-blue-400"
                   />
                </div>
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
               <div className="flex justify-between items-center mb-4">
                 <h2 className="text-lg font-semibold text-gray-800">1. 上传文件</h2>
                 {images.length > 0 && (
                   <button onClick={clearAll} className="text-xs text-red-600 hover:text-red-700 font-medium">清空</button>
                 )}
               </div>
               <ImageUploader onFilesSelected={handleFilesSelected} mode={mode} />
            </section>

            {images.length > 0 && (
              <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex justify-between items-center mb-4">
                   <h2 className="text-lg font-semibold text-gray-800">2. 调整顺序</h2>
                   <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{images.length} 个文件</span>
                </div>
                
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {images.map((img, index) => (
                    <div key={img.id} className="group relative flex items-center bg-gray-50 border border-gray-200 rounded-lg p-2">
                      <div className="flex flex-col space-y-1 mr-3 text-gray-400">
                        <button onClick={() => moveImage(index, 'up')} disabled={index === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><MoveUp size={16} /></button>
                        <button onClick={() => moveImage(index, 'down')} disabled={index === images.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><MoveDown size={16} /></button>
                      </div>

                      <div className="h-16 w-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-200 border border-gray-300 relative">
                        {img.isVideo ? (
                           <div className="w-full h-full flex items-center justify-center bg-gray-800">
                              <Video className="text-white" size={24} />
                           </div>
                        ) : (
                           <img src={img.previewUrl} alt="preview" className="h-full w-full object-cover" />
                        )}
                      </div>
                      
                      <div className="ml-4 flex-grow min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{img.file.name}</p>
                        <p className="text-xs text-gray-500">
                             {img.isVideo ? '视频文件 (提供声音)' : '图像文件 (提供画面)'}
                        </p>
                      </div>

                      <button onClick={() => removeImage(img.id)} className="ml-2 p-2 text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                    </div>
                  ))}
                </div>
              </section>
            )}

             <div className="sticky bottom-4 z-10">
                <Button 
                   onClick={handleStitch} 
                   disabled={images.length === 0}
                   isLoading={isProcessing}
                   className="w-full h-12 text-lg shadow-lg"
                >
                   {isProcessing ? '处理中...' : (mode === 'server' ? '生成实况照片' : '开始拼接')}
                </Button>
             </div>
          </div>

          <div className="lg:col-span-7">
             <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 h-full min-h-[500px] flex flex-col">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center justify-between">
                   <span>3. 拼接结果</span>
                   {result && (
                     <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 font-normal mr-2">
                        {result.width} x {result.height}px
                        </span>
                        <Button variant="primary" onClick={handleDownload} icon={<Download size={16} />}>
                           {result.isLivePhoto ? '下载实况照片 (JPG + MOV)' : '下载图片'}
                        </Button>
                     </div>
                   )}
                </h2>

                <div className="flex-grow flex items-center justify-center bg-slate-100 rounded-lg border-2 border-dashed border-slate-200 overflow-hidden relative">
                   {result ? (
                      <div className="w-full h-full overflow-auto custom-scrollbar p-4 flex flex-col items-center">
                         {result.isLivePhoto && (
                             <div className="mb-4 bg-green-50 border border-green-200 text-green-800 text-sm p-3 rounded-lg flex items-center max-w-md">
                                <Info size={16} className="mr-2 flex-shrink-0" />
                                <div>
                                    <p className="font-bold">实况照片已就绪</p>
                                    <p>点击下载将自动保存两份文件（JPG图片 + MOV视频）。请将它们保存到相册，iOS 会自动合并它们。</p>
                                </div>
                             </div>
                         )}
                         <img 
                            src={result.url} 
                            alt="拼接结果" 
                            className="max-w-full shadow-lg"
                         />
                      </div>
                   ) : (
                      <div className="text-center p-8 max-w-sm">
                         <div className="mx-auto w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                            {mode === 'server' ? <Smartphone className="text-slate-400" size={32} /> : <ImageIcon className="text-slate-400" size={32} />}
                         </div>
                         <h3 className="text-slate-900 font-medium">暂无结果</h3>
                         <p className="text-slate-500 text-sm mt-2">
                            {mode === 'server' 
                                ? '请上传包含声音来源的视频文件（或实况照片的原始文件）。我们将为您生成带声音的长实况照片。' 
                                : '上传图片并点击“开始拼接”以生成您的无缝长图。'}
                         </p>
                      </div>
                   )}
                </div>
             </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
