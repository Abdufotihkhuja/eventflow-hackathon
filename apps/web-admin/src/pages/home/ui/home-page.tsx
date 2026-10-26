export function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground">Добро пожаловать в EventFlow!</h1>
        <p className="mt-4 text-lg text-muted-foreground">Вы успешно вошли в систему.</p>
      </div>
    </div>
  )
}

export default HomePage
