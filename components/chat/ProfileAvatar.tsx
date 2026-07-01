import React from 'react';
import { UserProfile } from '../../types';

const emojiFor = (p: UserProfile) => (p.gender === 'female' ? '👩' : '🧑');

export const ProfileAvatar: React.FC<{ profile: UserProfile; size?: 'sm' | 'md' }> = ({ profile, size = 'md' }) => {
    const dim = size === 'sm' ? 'h-9 w-9' : 'h-12 w-12';
    const ring = profile.isSelf ? 'ring-2 ring-amber-400/80 ring-offset-2 ring-offset-white' : '';
    const bg =
        profile.gender === 'female'
            ? 'bg-gradient-to-br from-rose-100 to-rose-50'
            : 'bg-gradient-to-br from-indigo-100 to-indigo-50';

    return (
        <div className={`${dim} shrink-0 overflow-hidden rounded-full ${ring} ${!profile.avatar ? bg : ''}`}>
            {profile.avatar ? (
                <img src={profile.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
                <span className="flex h-full w-full items-center justify-center text-lg">{emojiFor(profile)}</span>
            )}
        </div>
    );
};
