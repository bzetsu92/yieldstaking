import { useCallback } from 'react';

import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';

import { AccountSettingsForm } from './account-settings-form';

interface AccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MODAL_CLASSES =
    'w-[90vw] !max-w-5xl max-h-[90vh] overflow-hidden m-0 rounded-lg flex flex-col';
const CONTENT_CLASSES =
    'overflow-x-hidden overflow-y-hidden flex-1 min-h-0';

export function AccountSettingsModal({ isOpen, onClose }: AccountSettingsModalProps) {
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
                    <AccountSettingsForm onCancel={onClose} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
