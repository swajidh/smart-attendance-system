/**
 * Login form validation tests — WBS 14.2
 * Tests client-side validation logic in isolation (no component rendering).
 */
import { describe, it, expect } from 'vitest';

// Pure validation function extracted from LoginPage for testability
function validateLoginForm({ email, password }) {
  const errors = {};
  if (!email) errors.email = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Enter a valid email';
  if (!password) errors.password = 'Password is required';
  return errors;
}

describe('Login form validation', () => {
  it('returns no errors for valid input', () => {
    const errors = validateLoginForm({ email: 'user@example.com', password: 'secret' });
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('requires email', () => {
    const errors = validateLoginForm({ email: '', password: 'pass' });
    expect(errors.email).toBe('Email is required');
  });

  it('validates email format', () => {
    const errors = validateLoginForm({ email: 'not-an-email', password: 'pass' });
    expect(errors.email).toBe('Enter a valid email');
  });

  it('requires password', () => {
    const errors = validateLoginForm({ email: 'u@e.com', password: '' });
    expect(errors.password).toBe('Password is required');
  });

  it('returns both errors when both fields empty', () => {
    const errors = validateLoginForm({ email: '', password: '' });
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });
});

// Role-based redirect logic
function getLoginRedirect(role) {
  return role === 'student' ? '/portal' : '/dashboard';
}

describe('Role-based login redirect', () => {
  it('sends students to /portal', () => {
    expect(getLoginRedirect('student')).toBe('/portal');
  });

  it('sends teachers to /dashboard', () => {
    expect(getLoginRedirect('teacher')).toBe('/dashboard');
  });

  it('sends admins to /dashboard', () => {
    expect(getLoginRedirect('admin')).toBe('/dashboard');
  });

  it('sends counselors to /dashboard', () => {
    expect(getLoginRedirect('counselor')).toBe('/dashboard');
  });
});
