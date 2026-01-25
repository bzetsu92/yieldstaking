import { useCallback } from 'react';

import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';

import { ChangePasswordForm } from './change-password-form';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MODAL_CLASSES = 'w-[90vw] max-w-md h-auto overflow-hidden m-0 rounded-lg';
const CONTENT_CLASSES = 'overflow-y-auto max-h-[85vh]';

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
    const handleOpenChange = useCallback(
        (open: boolean) => {
            if (!open) {
                onClose();
            }
        },
        [onClose],
    );

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className={MODAL_CLASSES}>
                <DialogHeader />
                <div className={CONTENT_CLASSES}>
                    <ChangePasswordForm />
                </div>
            </DialogContent>
        </Dialog>
    );
}
