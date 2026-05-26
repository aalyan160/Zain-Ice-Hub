import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', pin: '', role: 'staff', branch_id: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: empData, error: empErr } = await supabase
        .from('users')
        .select('*, branches(name)')
        .order('created_at', { ascending: false });
        
      if (!empErr && empData) setEmployees(empData);

      const { data: branchData, error: branchErr } = await supabase
        .from('branches')
        .select('*')
        .order('name');
        
      if (!branchErr && branchData) setBranches(branchData);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setFormError('');
    if (formData.pin.length < 4) {
      setFormError('PIN must be at least 4 digits');
      return;
    }

    if (formData.role === 'staff' && !formData.branch_id) {
      setFormError('Please select a branch for the staff member.');
      return;
    }

    const payload = {
      name: formData.name,
      pin: formData.pin,
      role: formData.role,
      branch_id: formData.role === 'staff' ? formData.branch_id : null
    };

    const { error } = await supabase.from('users').insert([payload]);
    if (error) {
      if (error.code === '23505') {
        setFormError('This PIN is already in use by another user.');
      } else {
        setFormError('Failed to add employee. Please try again.');
      }
      return;
    }

    setShowModal(false);
    setFormData({ name: '', pin: '', role: 'staff', branch_id: '' });
    fetchData();
  };

  const handleDelete = async (id, role) => {
    if (role === 'admin') {
      const adminCount = employees.filter(e => e.role === 'admin').length;
      if (adminCount <= 1) {
        alert('You cannot delete the only admin account.');
        return;
      }
    }
    
    if (window.confirm('Are you sure you want to remove this employee?')) {
      await supabase.from('users').delete().eq('id', id);
      fetchData();
    }
  };

  if (loading) return <div className="text-center mt-4">Loading employees...</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <div className="flex justify-between items-center mb-4">
        <h2>Employee Management</h2>
        <button className="btn btn-primary btn-icon-hover" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add Employee
        </button>
      </div>

      <div className="grid-3">
        <AnimatePresence>
          {employees.map(emp => (
            <motion.div 
              key={emp.id}
              className="glass-card"
              layout
              variants={{
                hidden: { opacity: 0, y: 20, height: 0, padding: 0, margin: 0, overflow: 'hidden' },
                visible: { opacity: 1, y: 0, height: 'auto', padding: '1.5rem', overflow: 'visible' }
              }}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {emp.avatar_url ? (
                      <img src={emp.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <UserIcon size={20} className="text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 style={{ margin: 0 }}>{emp.name}</h3>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {emp.role === 'admin' ? (
                        <span style={{ fontSize: '0.75rem', background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Shield size={10} /> Admin
                        </span>
                      ) : (
                        <>
                          <span style={{ fontSize: '0.75rem', background: 'var(--success)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>
                            Staff
                          </span>
                          {emp.branches?.name && (
                            <span style={{ fontSize: '0.75rem', background: 'var(--info)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>
                              📍 {emp.branches.name}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>PIN: <span style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.05)', padding: '2px 4px', borderRadius: '4px' }}>{emp.pin}</span></p>
                <button 
                  className="btn btn-sm btn-icon-hover" 
                  style={{ background: 'var(--danger)', color: 'white' }} 
                  onClick={() => handleDelete(emp.id, emp.role)}
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <motion.div 
            className="modal-content glass-card"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h3>Add New Employee</h3>
            <form onSubmit={handleAddEmployee}>
              <div className="mb-3">
                <label>Name</label>
                <input required className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Ali" />
              </div>
              <div className="mb-3">
                <label>Secret PIN</label>
                <input required className="input-field" value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})} placeholder="4-digit PIN" maxLength={8} />
              </div>
              <div className="mb-3">
                <label>Role</label>
                <select className="input-field" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value, branch_id: e.target.value === 'admin' ? '' : formData.branch_id})}>
                  <option value="staff">Staff (Can only Sell)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>
              
              {formData.role === 'staff' && (
                <div className="mb-4">
                  <label>Assign Branch</label>
                  <select 
                    required 
                    className="input-field" 
                    value={formData.branch_id} 
                    onChange={e => setFormData({...formData, branch_id: e.target.value})}
                  >
                    <option value="">-- Select Branch --</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {formError && <p className="text-danger mb-3" style={{ fontSize: '0.9rem' }}>{formError}</p>}
              
              <div className="flex gap-2 justify-end">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Employee</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

