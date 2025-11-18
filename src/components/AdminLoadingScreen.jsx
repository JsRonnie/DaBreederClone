// Reusable Loading Screen Component for Admin Pages
// Uses the same loading style as MyDog page for consistency
export default function AdminLoadingScreen({ message = "Loading..." }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mx-auto mb-4" />
        <p className="text-slate-600 font-medium">{message}</p>
      </div>
    </div>
  );
}
