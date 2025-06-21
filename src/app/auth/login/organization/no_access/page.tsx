import NextLink from 'next/link';
import Button from '@mui/material/Button';
import { Container } from '@mui/material';

export default function NoAccessPage() {
    return (
        <Container>
            <h1>Access Denied</h1>
            <p>You do not have permission to access this organization.</p>
            <p>If you believe this is an error, please contact support.</p>
            <br />
            <Button variant="contained" component={NextLink} href="/auth/login">
                Login Again
            </Button>
        </Container>
    );
}
