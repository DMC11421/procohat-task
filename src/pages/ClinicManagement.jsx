import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Trash2, Loader2, Plus, Edit } from 'lucide-react';

export default function ClinicManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClinic, setEditingClinic] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    clinicName: '',
    doctorName: '',
    clinicMail: '',
    clinicNumber: '',
    establishmentDate: '',
    location: '',
    panchakrma: '',
    numberOfPatients: '',
    revenue: '',
  });

  // Fetch clinics on mount
  useEffect(() => {
    fetchClinics();
  }, [user]);

  const fetchClinics = async () => {
    if (!user?.email) return;

    try {
      // Fetch only clinics created by current admin
      const clinicsQuery = query(
        collection(db, 'clinics'),
        where('createdBy', '==', user.email)
      );
      const querySnapshot = await getDocs(clinicsQuery);
      const clinicsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClinics(clinicsData);
    } catch (error) {
      console.error('Error fetching clinics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clinics.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.clinicName.trim() || !formData.doctorName.trim() || !formData.clinicMail.trim()) {
      toast({
        title: 'Warning',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      if (editingClinic) {
        // Update existing clinic
        await updateDoc(doc(db, 'clinics', editingClinic.id), {
          ...formData,
          updatedAt: serverTimestamp(),
        });

        toast({
          title: 'Success',
          description: 'Clinic updated successfully!',
        });
      } else {
        // Add new clinic
        await addDoc(collection(db, 'clinics'), {
          ...formData,
          createdBy: user?.email || 'unknown',
          createdAt: serverTimestamp(),
        });

        toast({
          title: 'Success',
          description: 'Clinic added successfully!',
        });
      }

      // Reset form
      setFormData({
        clinicName: '',
        doctorName: '',
        clinicMail: '',
        clinicNumber: '',
        establishmentDate: '',
        location: '',
        panchakrma: '',
        numberOfPatients: '',
        revenue: '',
      });

      // Close modal
      setIsModalOpen(false);
      setEditingClinic(null);

      // Refresh list
      await fetchClinics();
    } catch (error) {
      console.error('Error saving clinic:', error);
      toast({
        title: 'Error',
        description: `Failed to ${editingClinic ? 'update' : 'add'} clinic.`,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (clinic) => {
    setEditingClinic(clinic);
    setFormData({
      clinicName: clinic.clinicName || '',
      doctorName: clinic.doctorName || '',
      clinicMail: clinic.clinicMail || '',
      clinicNumber: clinic.clinicNumber || '',
      establishmentDate: clinic.establishmentDate || '',
      location: clinic.location || '',
      panchakrma: clinic.panchakrma || '',
      numberOfPatients: clinic.numberOfPatients || '',
      revenue: clinic.revenue || '',
    });
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setFormData({
      clinicName: '',
      doctorName: '',
      clinicMail: '',
      clinicNumber: '',
      establishmentDate: '',
      location: '',
      panchakrma: '',
      numberOfPatients: '',
      revenue: '',
    });
    setEditingClinic(null);
    setIsModalOpen(false);
  };

  const handleDelete = async (clinicId) => {
    if (!confirm('Are you sure you want to delete this clinic?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'clinics', clinicId));

      toast({
        title: 'Success',
        description: 'Clinic deleted successfully!',
      });

      // Refresh list
      await fetchClinics();
    } catch (error) {
      console.error('Error deleting clinic:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete clinic.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Clinic Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your clinics</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Clinic</span>
        </Button>
      </div>

      {/* Add/Edit Clinic Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClinic ? 'Edit Clinic' : 'Add New Clinic'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              {/* Clinic Name */}
              <div className="space-y-2">
                <Label htmlFor="clinicName">Clinic Name *</Label>
                <Input
                  id="clinicName"
                  name="clinicName"
                  type="text"
                  placeholder="Enter clinic name"
                  value={formData.clinicName}
                  onChange={handleInputChange}
                  disabled={submitting}
                  required
                />
              </div>

              {/* Doctor Name */}
              <div className="space-y-2">
                <Label htmlFor="doctorName">Doctor Name *</Label>
                <Input
                  id="doctorName"
                  name="doctorName"
                  type="text"
                  placeholder="Enter doctor name"
                  value={formData.doctorName}
                  onChange={handleInputChange}
                  disabled={submitting}
                  required
                />
              </div>

              {/* Clinic Mail */}
              <div className="space-y-2">
                <Label htmlFor="clinicMail">Clinic Email *</Label>
                <Input
                  id="clinicMail"
                  name="clinicMail"
                  type="email"
                  placeholder="Enter clinic email"
                  value={formData.clinicMail}
                  onChange={handleInputChange}
                  disabled={submitting}
                  required
                />
              </div>

              {/* Clinic Number */}
              <div className="space-y-2">
                <Label htmlFor="clinicNumber">Clinic Number</Label>
                <Input
                  id="clinicNumber"
                  name="clinicNumber"
                  type="tel"
                  placeholder="Enter clinic number"
                  value={formData.clinicNumber}
                  onChange={handleInputChange}
                  disabled={submitting}
                />
              </div>

              {/* Establishment Date */}
              <div className="space-y-2">
                <Label htmlFor="establishmentDate">Establishment Date</Label>
                <Input
                  id="establishmentDate"
                  name="establishmentDate"
                  type="date"
                  value={formData.establishmentDate}
                  onChange={handleInputChange}
                  disabled={submitting}
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="Enter location"
                  value={formData.location}
                  onChange={handleInputChange}
                  disabled={submitting}
                />
              </div>

              {/* Panchakrma */}
              <div className="space-y-2">
                <Label htmlFor="panchakrma">Panchakrma</Label>
                <Input
                  id="panchakrma"
                  name="panchakrma"
                  type="text"
                  placeholder="Enter panchakrma details"
                  value={formData.panchakrma}
                  onChange={handleInputChange}
                  disabled={submitting}
                />
              </div>

              {/* Number of Patients */}
              <div className="space-y-2">
                <Label htmlFor="numberOfPatients">No. of Patients</Label>
                <Input
                  id="numberOfPatients"
                  name="numberOfPatients"
                  type="number"
                  placeholder="Enter number of patients"
                  value={formData.numberOfPatients}
                  onChange={handleInputChange}
                  disabled={submitting}
                  min="0"
                />
              </div>

              {/* Revenue */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="revenue">Revenue</Label>
                <Input
                  id="revenue"
                  name="revenue"
                  type="number"
                  placeholder="Enter revenue amount"
                  value={formData.revenue}
                  onChange={handleInputChange}
                  disabled={submitting}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Clinics List */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold mb-4">Clinics List</h2>

        {clinics.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No clinics found. Add your first clinic using the button above.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile: Cards View */}
            <div className="sm:hidden space-y-3">
              {clinics.map((clinic, index) => (
                <Card key={clinic.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-muted-foreground">#{index + 1}</span>
                          <h3 className="font-semibold text-lg">{clinic.clinicName}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">{clinic.doctorName}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(clinic)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(clinic.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Clinic Number:</span>
                        <span className="font-medium">{clinic.clinicNumber || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">{clinic.location || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">No. of Patients:</span>
                        <span className="font-medium">{clinic.numberOfPatients || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Revenue:</span>
                        <span className="font-medium text-green-600">
                          {clinic.revenue ? `₹${parseFloat(clinic.revenue).toLocaleString()}` : '—'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop: Table View */}
            <Card className="hidden sm:block overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead className="w-[60px] px-4">ID</TableHead>
                        <TableHead className="min-w-[150px] px-4">Clinic Name</TableHead>
                        <TableHead className="min-w-[150px] px-4">Doctor Name</TableHead>
                        <TableHead className="min-w-[120px] px-4">Clinic Number</TableHead>
                        <TableHead className="min-w-[150px] px-4">Location</TableHead>
                        <TableHead className="min-w-[120px] px-4">No. of Patients</TableHead>
                        <TableHead className="min-w-[120px] px-4">Revenue</TableHead>
                        <TableHead className="min-w-[120px] px-4">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clinics.map((clinic, index) => (
                        <TableRow key={clinic.id} className="hover:bg-muted/50">
                          <TableCell className="px-4 py-3 font-medium">{index + 1}</TableCell>
                          <TableCell className="px-4 py-3">{clinic.clinicName}</TableCell>
                          <TableCell className="px-4 py-3">{clinic.doctorName}</TableCell>
                          <TableCell className="px-4 py-3">{clinic.clinicNumber || '—'}</TableCell>
                          <TableCell className="px-4 py-3">{clinic.location || '—'}</TableCell>
                          <TableCell className="px-4 py-3">{clinic.numberOfPatients || '—'}</TableCell>
                          <TableCell className="px-4 py-3">
                            {clinic.revenue ? `₹${parseFloat(clinic.revenue).toLocaleString()}` : '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(clinic)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(clinic.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
