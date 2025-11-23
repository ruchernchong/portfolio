const Loading = () => {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    </div>
  );
};

export default Loading;
