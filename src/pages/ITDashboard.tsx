
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { LogOut, UserPlus, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ITDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("register");

  const handleLogout = () => {
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-light tracking-tight text-gray-900">TraceMed</h1>
            <p className="text-gray-500">IT Dashboard</p>
          </div>
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs 
          defaultValue="register" 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="w-full max-w-5xl mx-auto"
        >
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="register" className="flex items-center gap-2">
              <UserPlus size={18} />
              <span>Employee Registration</span>
            </TabsTrigger>
            <TabsTrigger value="qrcode" className="flex items-center gap-2">
              <QrCode size={18} />
              <span>QR Code Scanner</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="register" className="p-6 bg-white rounded-lg shadow mt-6">
            <h2 className="text-xl font-medium mb-4">Employee Registration</h2>
            <p className="text-gray-500">
              This section will contain the employee registration interface.
            </p>
          </TabsContent>
          
          <TabsContent value="qrcode" className="p-6 bg-white rounded-lg shadow mt-6">
            <h2 className="text-xl font-medium mb-4">QR Code Scanner</h2>
            <p className="text-gray-500">
              This section will contain the QR code scanner functionality.
            </p>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ITDashboard;
