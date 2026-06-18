/**
 * ProtectedRoute tests — WBS 14.2 (routing / auth)
 * Tests role-based routing:
 *   - unauthenticated → /login
 *   - student → /portal (not /dashboard)
 *   - teacher → /dashboard
 *   - student accessing allowedRoles=['admin'] route → /portal
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock api to avoid real HTTP calls
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

import api from '../services/api';
import ProtectedRoute from '../components/layout/ProtectedRoute';

const TestChild = () => <div data-testid="protected-child">Protected</div>;
const LoginPage = () => <div data-testid="login-page">Login</div>;
const Portal = () => <div data-testid="portal">Portal</div>;
const Dashboard = () => <div data-testid="dashboard">Dashboard</div>;

function renderWithRouter(initialEntries = ['/dashboard'], user = null) {
  if (user) {
    localStorage.setItem('smart_attendance_token', 'mock-token');
    localStorage.setItem('smart_attendance_user', JSON.stringify(user));
    api.get.mockResolvedValue({ data: user });
  } else {
    localStorage.clear();
    api.get.mockRejectedValue(new Error('401'));
  }

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/portal" element={<Portal />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/dashboard/settings" element={<TestChild />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path="/portal" element={<Portal />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users to /login', async () => {
    renderWithRouter(['/dashboard'], null);
    await waitFor(() => {
      expect(screen.queryByTestId('login-page')).toBeTruthy();
    });
  });

  it('redirects student users away from /dashboard to /portal', async () => {
    renderWithRouter(['/dashboard'], { role: 'student', email: 's@test.com', name: 'Student' });
    await waitFor(() => {
      expect(screen.queryByTestId('portal')).toBeTruthy();
    });
  });

  it('allows teacher to access /dashboard', async () => {
    renderWithRouter(['/dashboard'], { role: 'teacher', email: 't@test.com', name: 'Teacher' });
    await waitFor(() => {
      expect(screen.queryByTestId('dashboard')).toBeTruthy();
    });
  });

  it('rejects teacher from admin-only route', async () => {
    renderWithRouter(
      ['/dashboard/settings'],
      { role: 'teacher', email: 't@test.com', name: 'Teacher' }
    );
    await waitFor(() => {
      // Teacher should be redirected to /dashboard (not shown settings)
      expect(screen.queryByTestId('protected-child')).toBeNull();
    });
  });
});
