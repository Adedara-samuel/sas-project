import React from 'react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md' }) => {
    let spinnerSize = 'h-8 w-8';
    if (size === 'sm') spinnerSize = 'h-5 w-5';
    if (size === 'lg') spinnerSize = 'h-12 w-12';

    return (
        <div className={`animate-spin rounded-full border-2 border-t-2 border-blue-500 ${spinnerSize}`}></div>
    );
};

export default LoadingSpinner;