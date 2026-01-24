export const MENU_ITEMS = [
    { id: 'account', label: 'Account', icon: 'User', path: null },
    { id: 'change-password', label: 'Change Password', icon: 'Lock', path: null },
    { id: 'notifications', label: 'Notifications', icon: 'Bell', path: '/notifications' },
] as const;

export const GENDER_OPTIONS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
] as const;
