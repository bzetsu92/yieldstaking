import { useNavigate } from 'react-router-dom';

export function SignUpLink() {
    const navigate = useNavigate();

    return (
        <div className="text-center text-sm">
            Don&apos;t have an account?{' '}
            <a
                href="#"
                className="underline underline-offset-4"
                onClick={(e) => {
                    e.preventDefault();
                    navigate('/register');
                }}
            >
                Sign up
            </a>
        </div>
    );
}
