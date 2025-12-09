import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { uploadImageToImgBB } from '@/lib/imgbb';
import { LogOut, FileText, User, Mail, Upload, X, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function UserPortalDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [userData, setUserData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [userImages, setUserImages] = useState([]);
  const [editingImage, setEditingImage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Get user email from session storage
    const userEmail = sessionStorage.getItem('userPortalEmail');
    if (!userEmail) {
      setLocation('/user-portal-login');
      return;
    }

    fetchUserData(userEmail);
    fetchUserDocuments(userEmail);
  }, []);

  const fetchUserData = async (email) => {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const data = {
          id: userDoc.id,
          ...userDoc.data(),
        };
        setUserData(data);
        setUserImages(data.images || []);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDocuments = async (email) => {
    try {
      const querySnapshot = await getDocs(collection(db, 'documents'));
      const allDocs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filter documents where user is assigned
      const userDocs = allDocs.filter(doc => 
        doc.assignedUsers?.some(user => user.email === email)
      );

      setDocuments(userDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('userPortalEmail');
    setLocation('/user-portal-login');
  };

  const handleDownload = (doc) => {
    // Create CSV content with assigned users
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
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image size should not exceed 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadImage = async () => {
    if (!selectedFile) {
      toast({
        title: 'Warning',
        description: 'Please select an image first.',
        variant: 'destructive',
      });
      return;
    }

    if (userImages.length >= 3 && !editingImage) {
      toast({
        title: 'Warning',
        description: 'Maximum 3 images allowed. Please delete an existing image first.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Upload to ImgBB
      const uploadResult = await uploadImageToImgBB(selectedFile);

      const imageData = {
        url: uploadResult.url,
        display_url: uploadResult.display_url,
        thumb_url: uploadResult.thumb_url,
        medium_url: uploadResult.medium_url,
        delete_url: uploadResult.delete_url,
        image_id: uploadResult.image_id,
        uploadedAt: new Date().toISOString(),
        filename: selectedFile.name,
      };

      const userDocRef = doc(db, 'users', userData.id);

      if (editingImage) {
        // Remove old image and add new one
        await updateDoc(userDocRef, {
          images: arrayRemove(editingImage),
        });
        await updateDoc(userDocRef, {
          images: arrayUnion(imageData),
        });

        toast({
          title: 'Success',
          description: 'Image updated successfully!',
        });
        setEditingImage(null);
      } else {
        // Add new image
        await updateDoc(userDocRef, {
          images: arrayUnion(imageData),
        });

        toast({
          title: 'Success',
          description: 'Image uploaded successfully!',
        });
      }

      // Refresh user data
      const userEmail = sessionStorage.getItem('userPortalEmail');
      await fetchUserData(userEmail);

      // Reset
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error?.message || 'Failed to upload image.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEditImage = (image) => {
    setEditingImage(image);
    setSidebarOpen(true);
    toast({
      title: 'Edit Mode',
      description: 'Select a new image to replace the existing one.',
    });
  };

  const handleDeleteImage = async (image) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      // Remove from Firestore
      const userDocRef = doc(db, 'users', userData.id);
      await updateDoc(userDocRef, {
        images: arrayRemove(image),
      });

      toast({
        title: 'Success',
        description: 'Image removed successfully!',
      });

      // Note: ImgBB free tier doesn't support API deletion
      // You can manually delete using the delete_url if needed
      if (image.delete_url) {
        console.log('Manual delete URL:', image.delete_url);
      }

      // Refresh user data
      const userEmail = sessionStorage.getItem('userPortalEmail');
      await fetchUserData(userEmail);
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete image.',
        variant: 'destructive',
      });
    }
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    setEditingImage(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">User not found</p>
            <Button onClick={() => setLocation('/user-portal-login')}>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">User Portal</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Welcome back!</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setSidebarOpen(true)} className="flex-1 sm:flex-none">
              <Upload className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Upload Images</span>
              <span className="sm:hidden">Upload</span>
            </Button>
            <Button variant="outline" onClick={handleLogout} className="flex-1 sm:flex-none">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 sm:p-6">
        {/* User Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Username</p>
                <p className="font-medium">{userData.username}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                <p className="font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {userData.email}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Role</p>
                <p className="font-medium capitalize">{userData.role}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    userData.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : userData.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {userData.status}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              My Documents ({documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No documents assigned to you yet.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {documents.map((doc) => (
                  <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                        <CardTitle className="text-lg truncate">{doc.documentName}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Assigned Users:</p>
                          <p className="text-sm font-medium">{doc.assignedUsers?.length || 0} user(s)</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Created By:</p>
                          <p className="text-sm font-medium">{doc.createdBy}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleDownload(doc)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Download CSV
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Right Sidebar for Image Upload */}
      {sidebarOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleCloseSidebar}
          />

          {/* Sidebar */}
          <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-background border-l shadow-lg z-50 overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  {editingImage ? 'Edit Image' : 'Upload Images'}
                </h2>
                <Button variant="ghost" size="sm" onClick={handleCloseSidebar}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Upload Section */}
              <Card className="mb-6">
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Select Image {editingImage && '(Replace)'}
                    </label>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      disabled={uploading}
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Selected: {selectedFile.name}
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleUploadImage}
                    disabled={uploading || !selectedFile}
                    className="w-full"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {editingImage ? 'Update Image' : 'Upload Image'}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Maximum 3 images • Max size: 5MB
                  </p>
                </CardContent>
              </Card>

              {/* Uploaded Images */}
              <div>
                <h3 className="text-sm font-medium mb-3">
                  Uploaded Images ({userImages.length}/3)
                </h3>
                {userImages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No images uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userImages.map((image, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardContent className="p-3">
                          <div className="flex gap-3">
                            <img
                              src={image.url}
                              alt={`Upload ${index + 1}`}
                              className="w-20 h-20 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate mb-2">
                                Image {index + 1}
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditImage(image)}
                                  disabled={uploading}
                                >
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteImage(image)}
                                  disabled={uploading}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
