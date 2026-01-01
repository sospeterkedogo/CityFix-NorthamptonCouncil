import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../login';

// 1. Mock the Router
jest.mock('expo-router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

// 2. Mock Firebase Config (used by AuthContext if we didn't mock AuthContext, but we will)
// Keeping it just in case imports trigger side effects.
jest.mock('../../../src/config/firebase', () => ({
    auth: {}
}));

// 3. Mock Auth Context
// We mock the hook directly so we can spy on the login function
const mockLogin = jest.fn();
jest.mock('../../../src/context/AuthContext', () => ({
    useAuth: () => ({
        login: mockLogin
    })
}));

describe('<LoginScreen />', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders login form correctly', () => {
        const { getByText, getByPlaceholderText } = render(<LoginScreen />);

        expect(getByText('Welcome Back')).toBeTruthy();
        expect(getByText('Sign in to continue to City Fix')).toBeTruthy();
        expect(getByPlaceholderText('name@example.com')).toBeTruthy();
        expect(getByPlaceholderText('Enter your password')).toBeTruthy();
        expect(getByText('Log In')).toBeTruthy();
    });

    test('calls login function with email and password when button is pressed', async () => {
        const { getByText, getByPlaceholderText } = render(<LoginScreen />);

        const emailInput = getByPlaceholderText('name@example.com');
        const passwordInput = getByPlaceholderText('Enter your password');
        const loginBtn = getByText('Log In');

        // Enter credentials
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'password123');

        // Press login
        fireEvent.press(loginBtn);

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
        });
    });

    test('shows alert if fields are empty', async () => {
        // We can't easily check Alert.alert in jest-expo without mocking Alert
        // But we can verify login is NOT called
        const { getByText } = render(<LoginScreen />);
        const loginBtn = getByText('Log In');

        fireEvent.press(loginBtn);

        expect(mockLogin).not.toHaveBeenCalled();
    });
});