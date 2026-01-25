import { IconWallet } from '@tabler/icons-react';
import { User, Mail, Phone, Upload, X, Camera } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { isAddress } from 'viem';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useUserProfile, useUpdateProfile } from '@/hooks/use-api-queries';
import { useUserInfo } from '@/hooks/use-user-info';

import { DatePickerField } from './date-picker-field';
import { FormField } from './form-field';
import { GENDER_OPTIONS } from './profile-constants';

interface AccountSettingsFormProps {
    onCancel?: () => void;
}

export function AccountSettingsForm({ onCancel }: AccountSettingsFormProps = {}) {
    const userInfo = useUserInfo();
    const { data: profileData, isLoading: isLoadingProfile } = useUserProfile();
    const updateProfileMutation = useUpdateProfile();

    const displayEmail = useMemo(() => {
        if (profileData?.user?.email) {
            return profileData.user.email;
        }
        if (!userInfo.email) return '';
        if (isAddress(userInfo.email)) return '';
        if (userInfo.email.includes('@')) {
            return userInfo.email;
        }
        return '';
    }, [userInfo.email, profileData?.user?.email]);

    const hasExistingEmail = useMemo(() => {
        return !!(profileData?.user?.email || (userInfo.email && userInfo.email.includes('@') && !isAddress(userInfo.email)));
    }, [userInfo.email, profileData?.user?.email]);

    const getInitialProfile = useCallback(() => {
        const nameParts = (profileData?.user?.name || userInfo.name || '').split(' ');
        return {
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: profileData?.user?.email || displayEmail || '',
            phone: '',
            dateOfBirth: '',
            gender: 'male',
            bio: profileData?.user?.bio || '',
            avatar: profileData?.user?.avatar || userInfo.avatar || '',
        };
    }, [userInfo.name, displayEmail, profileData, userInfo.avatar]);

    const [profile, setProfile] = useState(() => {
        const nameParts = (userInfo.name || '').split(' ');
        return {
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: displayEmail || '',
        phone: '',
        dateOfBirth: '',
        gender: 'male',
        bio: '',
            avatar: userInfo.avatar || '',
        };
    });

    const [avatarPreview, setAvatarPreview] = useState<string | null>(
        profileData?.user?.avatar || userInfo.avatar || null,
    );
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const initialProfileRef = useRef(profile);

    useEffect(() => {
        const initial = getInitialProfile();
        setProfile(initial);
        setAvatarPreview(initial.avatar || null);
        initialProfileRef.current = initial;
    }, [getInitialProfile]);

    const updateProfile = useCallback((field: keyof typeof profile, value: string | boolean) => {
        setProfile((prev) => ({ ...prev, [field]: value }));
    }, []);

    const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }, []);

    const handleRemoveAvatar = useCallback(() => {
        setAvatarPreview(null);
        if (avatarInputRef.current) {
            avatarInputRef.current.value = '';
        }
    }, []);

    const handleSave = useCallback(async () => {
        try {
            const fullName =
                `${profile.firstName} ${profile.lastName}`.trim() ||
                profile.firstName ||
                profile.lastName;
            await updateProfileMutation.mutateAsync({
                name: fullName || undefined,
                bio: profile.bio || undefined,
                avatar: avatarPreview || undefined,
            });
        } catch {
        }
    }, [profile, avatarPreview, updateProfileMutation]);

    const handleCancel = useCallback(() => {
        if (onCancel) {
            onCancel();
        } else {
            setProfile(initialProfileRef.current);
        }
    }, [onCancel]);

    return (
        <div className="space-y-3 pb-3 overflow-x-hidden h-full flex flex-col">
            <Card className="flex-1 min-h-0 flex flex-col">
                <CardHeader className="pb-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg font-semibold">Personal Information</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="overflow-x-hidden pt-2 flex-1 min-h-0 overflow-y-auto">
                    <div className="grid gap-3 lg:grid-cols-2 min-w-0">
                        <div className="space-y-3 min-w-0">
                            <div className="grid gap-3 sm:grid-cols-2 min-w-0">
                        <FormField
                            id="firstName"
                            label="First Name"
                            value={profile.firstName}
                            onChange={(value) => updateProfile('firstName', value)}
                            placeholder="Enter your first name"
                        />
                        <FormField
                            id="lastName"
                            label="Last Name"
                            value={profile.lastName}
                            onChange={(value) => updateProfile('lastName', value)}
                            placeholder="Enter your last name"
                        />
                    </div>
                            <div className="space-y-2 min-w-0">
                                <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1.5">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    Email Address
                                    {userInfo.authMethod === 'wallet' && !hasExistingEmail && (
                                        <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                                    )}
                                    {hasExistingEmail && (
                                        <span className="text-xs text-muted-foreground font-normal">(Read-only)</span>
                                    )}
                                </Label>
                            <FormField
                                id="email"
                                label=""
                                value={profile.email}
                                onChange={(value) => updateProfile('email', value)}
                                placeholder={
                                    userInfo.authMethod === 'wallet'
                                        ? 'Enter your email address (optional)'
                                        : 'Enter your email address'
                                }
                                type="email"
                                disabled={hasExistingEmail}
                            />
                        </div>
                            <div className="space-y-2 min-w-0">
                                <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-1.5">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                Phone Number
                            </Label>
                            <FormField
                                id="phone"
                                label=""
                                value={profile.phone}
                                onChange={(value) => updateProfile('phone', value)}
                                placeholder="Enter your phone number"
                                type="tel"
                            />
                        </div>
                            <div className="grid gap-3 sm:grid-cols-2 min-w-0">
                        <DatePickerField
                            id="dateOfBirth"
                            label="Date of Birth"
                            value={profile.dateOfBirth}
                            onChange={(value) => updateProfile('dateOfBirth', value)}
                        />
                        <FormField
                            id="gender"
                            label="Gender"
                            value={profile.gender}
                            onChange={(value) => updateProfile('gender', value)}
                        >
                            <Select
                                value={profile.gender}
                                onValueChange={(value) => updateProfile('gender', value)}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {GENDER_OPTIONS.map(
                                        (option: (typeof GENDER_OPTIONS)[number]) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ),
                                    )}
                                </SelectContent>
                            </Select>
                        </FormField>
                            </div>
                        </div>

                        <div className="space-y-3 min-w-0">
                        <div className="space-y-2">
                                <Label className="text-sm font-medium">Avatar</Label>
                                <div className="relative w-full aspect-square max-w-[140px] mx-auto lg:mx-0">
                                    {avatarPreview ? (
                                        <div className="relative w-full h-full rounded-lg overflow-hidden border-2 border-border group">
                                            <img
                                                src={avatarPreview}
                                                alt="Avatar preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                            <button
                                                type="button"
                                                onClick={handleRemoveAvatar}
                                                className="absolute top-2 right-2 rounded-full bg-destructive p-1.5 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => avatarInputRef.current?.click()}
                                                className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary p-2 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                            >
                                                <Camera className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => avatarInputRef.current?.click()}
                                            className="w-full h-full rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors bg-muted/30"
                                        >
                                            <div className="p-3 rounded-full bg-primary/10">
                                                <Upload className="h-6 w-6 text-primary" />
                                            </div>
                                            <p className="text-sm font-medium">Upload Avatar</p>
                                            <p className="text-xs text-muted-foreground text-center px-4">
                                                JPG, PNG, GIF • Max 5MB
                                            </p>
                                        </div>
                                    )}
                                    <input
                                        ref={avatarInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        className="hidden"
                                    />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="bio" className="text-sm font-medium">
                            Bio
                        </Label>
                        <textarea
                            id="bio"
                            value={profile.bio}
                            onChange={(e) => updateProfile('bio', e.target.value)}
                            placeholder="Tell us about yourself..."
                                    rows={3}
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                        />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="flex-shrink-0">
                <CardContent className="overflow-x-hidden pt-3">
                    {userInfo.isConnected && userInfo.walletAddress ? (
                        <div className="flex items-start gap-2.5 p-3 bg-muted/30 rounded-lg border min-w-0">
                            <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
                                <IconWallet className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm mb-0.5">Connected Wallet</p>
                                <p className="text-xs text-muted-foreground font-mono break-all word-break break-words">
                                    {userInfo.walletAddress}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-2.5 p-3 bg-muted/30 rounded-lg border border-dashed">
                            <div className="p-1.5 bg-muted rounded-lg shrink-0">
                                <IconWallet className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-sm mb-0.5">No Wallet Connected</p>
                                <p className="text-xs text-muted-foreground">
                                    Connect a wallet to link it to your account
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>


            <div className="flex-shrink-0 bg-background border-t pt-3 pb-2 mt-3">
                <div className="flex justify-end gap-2.5 w-full">
                    <Button variant="outline" onClick={handleCancel} type="button" className="shrink-0 h-9">
                    Cancel
                </Button>
                <Button
                    onClick={() => void handleSave()}
                    disabled={updateProfileMutation.isPending || isLoadingProfile}
                        type="button"
                        className="shrink-0 h-9"
                >
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                </div>
            </div>
        </div>
    );
}
