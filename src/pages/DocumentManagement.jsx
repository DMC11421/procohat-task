import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Download, Trash2, FileText, Loader2 } from 'lucide-react';
import Select from 'react-select';

export default function DocumentManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [documentName, setDocumentName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch approved users and documents on mount
  useEffect(() => {
    fetchApprovedUsers();
    fetchDocuments();
  }, [user]);

  const fetchApprovedUsers = async () => {
    if (!user?.email) return;

    try {
      // Fetch only approved users created by current admin
      const q = query(
        collection(db, 'users'),
        where('createdBy', '==', user.email),
        where('status', '==', 'approved')
      );
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map(doc => ({
        value: doc.id,
        label: `${doc.data().username} (${doc.data().email})`,
        email: doc.data().email,
        username: doc.data().username,
      }));
      setApprovedUsers(users);
    } catch (error) {
      console.error('Error fetching approved users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load approved users.',
        variant: 'destructive',
      });
    }
  };

  const fetchDocuments = async () => {
    if (!user?.email) return;

    try {
      // Fetch only documents created by current admin
      const documentsQuery = query(
        collection(db, 'documents'),
        where('createdBy', '==', user.email)
      );
      const querySnapshot = await getDocs(documentsQuery);
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDocuments(docs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Only show error if it's not a permission issue for empty collection
      if (error.code !== 'permission-denied') {
        toast({
          title: 'Error',
          description: 'Failed to load documents.',
          variant: 'destructive',
        });
      }
      // Set empty array on error
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!documentName.trim()) {
      toast({
        title: 'Warning',
        description: 'Please enter a document name.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedUsers.length === 0) {
      toast({
        title: 'Warning',
        description: 'Please select at least one approved user.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, 'documents'), {
        documentName: documentName.trim(),
        assignedUsers: selectedUsers.map(u => ({
          id: u.value,
          username: u.username,
          email: u.email,
        })),
        createdAt: serverTimestamp(),
        createdBy: user?.email || 'unknown',
      });

      toast({
        title: 'Success',
        description: 'Document created successfully!',
      });

      // Reset form
      setDocumentName('');
      setSelectedUsers([]);

      // Refresh documents
      await fetchDocuments();
    } catch (error) {
      console.error('Error creating document:', error);
      toast({
        title: 'Error',
        description: 'Failed to create document.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = (doc) => {
    // Create CSV content
    const headers = ['Username', 'Email'];
    const rows = doc.assignedUsers.map(user => [user.username, user.email]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${doc.documentName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Success',
      description: 'CSV downloaded successfully!',
    });
  };

  const handleDelete = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'documents', documentId));
      
      toast({
        title: 'Success',
        description: 'Document deleted successfully!',
      });

      // Refresh documents
      await fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete document.',
        variant: 'destructive',
      });
    }
  };

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      minHeight: '36px',
      borderColor: 'hsl(var(--input))',
      '&:hover': {
        borderColor: 'hsl(var(--input))',
      },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'hsl(var(--popover))',
      border: '1px solid hsl(var(--border))',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? 'hsl(var(--accent))' : 'transparent',
      color: 'hsl(var(--foreground))',
      '&:hover': {
        backgroundColor: 'hsl(var(--accent))',
      },
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: 'hsl(var(--primary))',
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: 'hsl(var(--primary-foreground))',
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: 'hsl(var(--primary-foreground))',
      '&:hover': {
        backgroundColor: 'hsl(var(--primary))',
        color: 'hsl(var(--primary-foreground))',
      },
    }),
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
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Document Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage documents and assign them to approved users.</p>
      </div>

      {/* Document Creation Form */}
      <Card className="mb-6 sm:mb-8">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Create New Document</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Document Name */}
              <div className="space-y-2">
                <Label htmlFor="documentName">Document Name</Label>
                <Input
                  id="documentName"
                  type="text"
                  placeholder="Enter document name"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {/* Approved Users Multi-Select */}
              <div className="space-y-2">
                <Label htmlFor="approvedUsers">Approved Users</Label>
                <Select
                  id="approvedUsers"
                  isMulti
                  options={approvedUsers}
                  value={selectedUsers}
                  onChange={setSelectedUsers}
                  placeholder="Search and select users..."
                  isSearchable
                  isDisabled={submitting}
                  styles={customSelectStyles}
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto sm:min-w-[120px]">
                {submitting ? 'Creating...' : 'Submit'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Documents List */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Documents</h2>
        {documents.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No documents found. Create your first document above.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documents.map((document) => (
              <Card key={document.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                      <CardTitle className="text-lg truncate">{document.documentName}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Assigned Users:</p>
                      <p className="text-sm font-medium">{document.assignedUsers?.length || 0} user(s)</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Created By:</p>
                      <p className="text-sm font-medium">{document.createdBy}</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleDownload(document)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(document.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
