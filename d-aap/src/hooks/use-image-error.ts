import { useState } from 'react';

export function useImageError() {
    const [imageError, setImageError] = useState(false);

    const handleImageError = () => {
        setImageError(true);
    };

    const resetImageError = () => {
        setImageError(false);
    };

    return {
        imageError,
        setImageError,
        handleImageError,
        resetImageError,
    };
}

