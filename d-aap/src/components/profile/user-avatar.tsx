import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

interface UserAvatarProps {
    avatar?: string;
    name: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
};

export function UserAvatar({ avatar, name, size = 'md', className = '' }: UserAvatarProps) {
    const initials = getInitials(name, 2);

    return (
        <Avatar className={`${sizeClasses[size]} rounded-lg ${className}`}>
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
        </Avatar>
    );
}
