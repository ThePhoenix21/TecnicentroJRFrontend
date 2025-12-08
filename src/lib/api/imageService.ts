
interface UploadProgress {
  loaded: number;
  total: number;
  file: File;
}

interface UploadResponse {
  url: string;
  path: string;
}

export const uploadImage = async (
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResponse> => {
  // Validaciones
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    throw new Error('Tipo de archivo no soportado. Use JPEG, PNG o WebP.');
  }

  if (file.size > maxSize) {
    throw new Error('El archivo es demasiado grande. Tamaño máximo: 5MB');
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL || ''}images/upload`, true);
      
      // Configurar el manejador de progreso
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            file
          });
        }
      };

      xhr.setRequestHeader('Authorization', `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : ''}`);

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            const errorMsg = {
              message: 'Error al procesar la respuesta del servidor. Intente nuevamente.',
              type: 'error',
              className: 'bg-error-light text-error border-l-4 border-error p-4 mb-4 rounded-r'
            };
            console.error('Error al procesar la respuesta del servidor:', error);
            reject(errorMsg);
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            let errorMsg = {
              message: 'No se pudo subir la imagen',
              type: 'error',
              className: 'bg-error-light text-error border-l-4 border-error p-4 mb-4 rounded-r'
            };
            
            // Mensajes de error más específicos basados en el código de estado
            if (xhr.status === 401) {
              errorMsg = {
                message: '🔐 Sesión expirada. Por favor, inicie sesión nuevamente.',
                type: 'auth',
                className: 'bg-warning-light text-warning border-l-4 border-warning p-4 mb-4 rounded-r'
              };
            } else if (xhr.status === 413) {
              errorMsg = {
                message: '📏 La imagen es demasiado grande. Tamaño máximo: 5MB',
                type: 'validation',
                className: 'bg-warning-light text-warning border-l-4 border-warning p-4 mb-4 rounded-r'
              };
            } else if (errorResponse.message) {
              errorMsg.message = errorResponse.message;
            }
            
            console.error(`Error ${xhr.status} al subir la imagen:`, errorResponse);
            reject(errorMsg);
          } catch {
            const errorMsg = xhr.status === 0 
              ? {
                  message: '🌐 No hay conexión a internet. Verifique su conexión e intente nuevamente.',
                  type: 'network',
                  className: 'bg-error-light text-error border-l-4 border-error p-4 mb-4 rounded-r'
                }
              : {
                  message: '❌ Error al subir la imagen. Por favor, intente nuevamente.',
                  type: 'error',
                  className: 'bg-error-light text-error border-l-4 border-error p-4 mb-4 rounded-r'
                };
              
            console.error(`Error ${xhr.status} al subir la imagen`);
            reject(errorMsg);
          }
        }
      };

      xhr.ontimeout = () => {
        const errorMsg = {
          message: '⏱️ La conexión está tardando demasiado. Verifique su conexión e intente nuevamente.',
          type: 'timeout',
          className: 'bg-warning-light text-warning border-l-4 border-warning p-4 mb-4 rounded-r'
        };
        console.error('Tiempo de espera agotado al subir la imagen');
        reject(errorMsg);
      };

      xhr.onerror = () => {
        const errorMsg = {
          message: '🔌 Error de conexión. Verifique su conexión a internet e intente nuevamente.',
          type: 'network',
          className: 'bg-error-light text-error border-l-4 border-error p-4 mb-4 rounded-r'
        };
        console.error('Error de red al subir la imagen');
        reject(errorMsg);
      };

      xhr.send(formData);
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

export const uploadImages = async (
  files: File[],
  onProgress?: (progress: { total: number; completed: number; currentFile: File }) => void
): Promise<{ 
  urls: string[]; 
  failed: { file: File; error: string }[] 
}> => {
  const results = {
    urls: [] as string[],
    failed: [] as { file: File; error: string }[]
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const { url } = await uploadImage(file, (progress) => {
        onProgress?.({
          total: files.length,
          completed: i + (progress.loaded / progress.total),
          currentFile: file
        });
      });
      results.urls.push(url);
    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error);
      results.failed.push({
        file,
        error: error instanceof Error ? error.message : 'Error desconocido al subir el archivo'
      });
    }
  }

  return results;
};

// Función auxiliar para obtener la URL de la API
export const getApiUrl = (): string => {
  if (typeof window === 'undefined') return ''; // Para SSR
  return process.env.NEXT_PUBLIC_API_URL || window.location.origin;
};