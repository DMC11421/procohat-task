import axios from 'axios';

// ImgBB API Key - Get your free API key from https://api.imgbb.com/
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || '8a3c7c8f5f8e8c8f5f8e8c8f5f8e8c8f';

/**
 * Upload image to ImgBB
 * @param {File} imageFile - The image file to upload
 * @returns {Promise<Object>} - Returns object with url and delete_url
 */
export const uploadImageToImgBB = async (imageFile) => {
    try {
        // Convert file to base64
        const base64Image = await fileToBase64(imageFile);

        // Remove data:image/...;base64, prefix
        const base64Data = base64Image.split(',')[1];

        // Create form data
        const formData = new FormData();
        formData.append('image', base64Data);
        formData.append('name', imageFile.name);

        // Upload to ImgBB
        const response = await axios.post(
            `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        if (response.data.success) {
            return {
                url: response.data.data.url,
                display_url: response.data.data.display_url,
                delete_url: response.data.data.delete_url,
                thumb_url: response.data.data.thumb.url,
                medium_url: response.data.data.medium.url,
                image_id: response.data.data.id,
            };
        } else {
            throw new Error('Failed to upload image to ImgBB');
        }
    } catch (error) {
        console.error('ImgBB upload error:', error);
        throw error;
    }
};

/**
 * Delete image from ImgBB (Note: ImgBB free tier doesn't support API deletion)
 * Images will auto-expire based on your account settings
 * @param {string} deleteUrl - The delete URL from upload response
 */
export const deleteImageFromImgBB = async (deleteUrl) => {
    // ImgBB free API doesn't support programmatic deletion
    // You can manually delete using the delete_url in browser
    // Or images will expire based on account settings
    console.log('Delete URL:', deleteUrl);
    return true;
};

/**
 * Convert File to Base64
 * @param {File} file - The file to convert
 * @returns {Promise<string>} - Base64 string
 */
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
};
