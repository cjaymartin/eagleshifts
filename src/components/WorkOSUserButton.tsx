'use client';

import React, { useState } from 'react';
import {
    Avatar,
    Button,
    IconButton,
    Menu,
    MenuItem,
    Typography,
    Box,
    Divider,
    ListItemIcon,
} from '@mui/material';
import { Logout, Person, Business } from '@mui/icons-material';
import { useAuth } from '@workos-inc/authkit-react';
import { useWorkOSContext } from '@/components/providers/AuthKitProvider';
import Link from 'next/link';

export function WorkOSUserButton() {
    const { user: authUser, signOut } = useAuth();
    const { user: serverUser } = useWorkOSContext();

    // Prefer authUser (client-side) but fallback to serverUser (server-side hydration)
    const user = authUser || serverUser;

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleSignOut = async () => {
        handleClose();
        try {
            await signOut();
        } catch (e) {
            console.error('Sign out error:', e);
        }
        // Force redirect to server-side logout to ensure cookies are cleared
        window.location.href = '/auth/logout';
    };

    if (!user) {
        return (
            <Button
                variant="outlined"
                size="small"
                href="/auth/login"
                sx={{ ml: 2 }}
            >
                Sign In
            </Button>
        );
    }

    // Get initials for avatar
    const getInitials = () => {
        if (user.firstName && user.lastName) {
            return `${user.firstName[0]}${user.lastName[0]}`;
        }
        return user.email?.[0]?.toUpperCase() || 'U';
    };

    return (
        <>
            <IconButton
                onClick={handleClick}
                size="small"
                sx={{ ml: 2 }}
                aria-controls={open ? 'account-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
            >
                <Avatar
                    src={user?.profilePictureUrl || undefined}
                    sx={{ width: 32, height: 32 }}
                >
                    {getInitials()}
                </Avatar>
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                id="account-menu"
                open={open}
                onClose={handleClose}
                onClick={handleClose}
                PaperProps={{
                    elevation: 0,
                    sx: {
                        overflow: 'visible',
                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                        mt: 1.5,
                        '& .MuiAvatar-root': {
                            width: 32,
                            height: 32,
                            ml: -0.5,
                            mr: 1,
                        },
                        '&:before': {
                            content: '""',
                            display: 'block',
                            position: 'absolute',
                            top: 0,
                            right: 14,
                            width: 10,
                            height: 10,
                            bgcolor: 'background.paper',
                            transform: 'translateY(-50%) rotate(45deg)',
                            zIndex: 0,
                        },
                    },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="subtitle1" noWrap>
                        {user?.firstName || 'User'} {user?.lastName || ''}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                        {user?.email || 'No email'}
                    </Typography>
                </Box>
                <Divider />
                <MenuItem
                    component={Link}
                    href="/account"
                    onClick={handleClose}
                >
                    <ListItemIcon>
                        <Person fontSize="small" />
                    </ListItemIcon>
                    My Account
                </MenuItem>
                <MenuItem
                    component={Link}
                    href="/business"
                    onClick={handleClose}
                >
                    <ListItemIcon>
                        <Business fontSize="small" />
                    </ListItemIcon>
                    My Business
                </MenuItem>
                <MenuItem onClick={handleSignOut}>
                    <ListItemIcon>
                        <Logout fontSize="small" />
                    </ListItemIcon>
                    Sign Out
                </MenuItem>
            </Menu>
        </>
    );
}
