import React, { useState } from 'react';
import { UserCheck, AlertCircle, User, Mail, Hash, BookOpen, Building2, Loader2 } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function StudentRegistrationForm({ onSubmit, onStudentCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roll_no: '',
    student_id: '',
    department: 'Computer Science',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Full Name is required';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email Address is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format (user@domain.com)';
    }

    if (!formData.roll_no.trim()) {
      newErrors.roll_no = 'Roll Number is required';
    } else if (!/^[a-zA-Z0-9-]+$/.test(formData.roll_no)) {
      newErrors.roll_no = 'Format must be alphanumeric (e.g. CS-101)';
    }

    if (!formData.student_id.trim()) {
      newErrors.student_id = 'Student ID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/students', formData);
      const createdStudent = res.data;
      toast.success(`Student record created for ${createdStudent.name}`);
      if (onStudentCreated) onStudentCreated(createdStudent);
      if (onSubmit) onSubmit(createdStudent);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to create student record';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors(prev => ({ ...prev, [id]: undefined }));
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-4 text-left">
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
            Full Name *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Ali Hassan"
              className={`w-full pl-9 pr-4 py-2 text-sm border rounded-lg outline-none transition-all ${errors.name ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
            />
          </div>
          {errors.name && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            Email Address *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="student@university.edu"
              className={`w-full pl-9 pr-4 py-2 text-sm border rounded-lg outline-none transition-all ${errors.email ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
            />
          </div>
          {errors.email && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="student_id" className="block text-sm font-medium text-slate-700 mb-1">
              Student ID *
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="student_id"
                type="text"
                value={formData.student_id}
                onChange={handleChange}
                placeholder="STU-001"
                className={`w-full pl-9 pr-4 py-2 text-sm border rounded-lg outline-none transition-all ${errors.student_id ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
              />
            </div>
            {errors.student_id && <p className="mt-1 text-xs text-red-500">{errors.student_id}</p>}
          </div>

          <div>
            <label htmlFor="roll_no" className="block text-sm font-medium text-slate-700 mb-1">
              Roll Number *
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="roll_no"
                type="text"
                value={formData.roll_no}
                onChange={handleChange}
                placeholder="CS-21-001"
                className={`w-full pl-9 pr-4 py-2 text-sm border rounded-lg outline-none transition-all ${errors.roll_no ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
              />
            </div>
            {errors.roll_no && <p className="mt-1 text-xs text-red-500">{errors.roll_no}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="department" className="block text-sm font-medium text-slate-700 mb-1">
            Department
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <select
              id="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option>Computer Science</option>
              <option>Electrical Engineering</option>
              <option>Mechanical Engineering</option>
              <option>Civil Engineering</option>
              <option>Business Administration</option>
              <option>Mathematics</option>
              <option>Physics</option>
            </select>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          icon={isSubmitting ? Loader2 : UserCheck}
          className={`w-full h-11 text-base ${isSubmitting ? 'opacity-80 cursor-not-allowed' : ''}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating Record...' : 'Proceed to Face Capture'}
        </Button>
      </div>
    </form>
  );
}
