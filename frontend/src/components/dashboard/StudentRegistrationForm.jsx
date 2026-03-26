import React, { useState } from 'react';
import { UserCheck, AlertCircle } from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';

export default function StudentRegistrationForm({ onSubmit, existingIds = [] }) {
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    rollNo: '',
    department: ''
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.studentId.trim()) newErrors.studentId = 'Student ID is required';
    if (existingIds.includes(formData.studentId.trim())) newErrors.studentId = 'This Student ID is already enrolled.';
    
    if (!formData.name.trim()) newErrors.name = 'Full Name is required';
    if (!formData.rollNo.trim()) newErrors.rollNo = 'Roll Number is required';
    if (!formData.department) newErrors.department = 'Please select a department';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    // Clear error for field when user starts typing
    if (errors[id]) {
      setErrors(prev => ({ ...prev, [id]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-5 text-left text-sm z-10 relative">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-slate-900 mb-1">Student Details</h3>
        <p className="text-slate-500">Enter information before capturing face embeddings.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input 
          id="studentId"
          label="Student ID"
          placeholder="e.g. STU-2023-014"
          value={formData.studentId}
          onChange={handleChange}
          error={errors.studentId}
          className="col-span-2"
        />
        
        <Input 
          id="name"
          label="Full Name"
          placeholder="e.g. Ali Khan"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          className="col-span-2"
        />

        <Input 
          id="rollNo"
          label="Roll / Seat Number"
          placeholder="e.g. BESE-10C"
          value={formData.rollNo}
          onChange={handleChange}
          error={errors.rollNo}
        />

        <Select 
          id="department"
          label="Department"
          value={formData.department}
          onChange={handleChange}
          error={errors.department}
          options={[
            { value: 'software', label: 'Software Engineering' },
            { value: 'computer', label: 'Computer Science' },
            { value: 'electrical', label: 'Electrical Engineering' },
            { value: 'business', label: 'Business Administration' }
          ]}
        />
      </div>

      <div className="pt-4 border-t border-slate-100 mt-6">
        <Button type="submit" variant="primary" icon={UserCheck} className="w-full h-11 text-base">
          Proceed to Face Capture
        </Button>
      </div>
    </form>
  );
}
