export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500 text-white font-bold text-xl mb-4">
            T
          </div>
          <h1 className="text-2xl font-bold text-slate-900">ThreadScope</h1>
          <p className="text-sm text-slate-500 mt-1">Threads Intelligence Platform</p>
        </div>
        {children}
      </div>
    </div>
  );
}
