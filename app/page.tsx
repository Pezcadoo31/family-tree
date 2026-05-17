import { supabase } from '@/lib/supabase';
import type { Person } from '@/lib/types';

// This is a Server Component (no 'use client' directive)
// It runs on the server, fetches data, and sends rendered HTML to the browser
export default async function Home() {
  // Fetch all persons from the database
  const { data: persons, error } = await supabase
    .from('persons')
    .select('*')
    .order('given_name', { ascending: true });

  // Handle errors gracefully
  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-red-600">
            Error loading family tree
          </h1>
          <p className="mt-2 text-zinc-500">{error.message}</p>
        </div>
      </main>
    );
  }

  // Render the list of persons
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-semibold tracking-tight">
            Family Tree
          </h1>
          <p className="mt-3 text-zinc-500">
            Una plataforma para preservar tu historia familiar.
          </p>
        </header>

        <section>
          <h2 className="text-lg font-semibold mb-4">
            Personas registradas ({persons?.length ?? 0})
          </h2>

          {persons && persons.length > 0 ? (
            <ul className="space-y-2">
              {persons.map((person: Person) => (
                <li
                  key={person.id}
                  className="p-4 border border-zinc-200 rounded-lg"
                >
                  <p className="font-medium">
                    {person.given_name}
                    {person.paternal_surname && ` ${person.paternal_surname}`}
                    {person.maternal_surname && ` ${person.maternal_surname}`}
                    {person.nickname && (
                      <span className="text-zinc-500 font-normal">
                        {' '}
                        ({person.nickname})
                      </span>
                    )}
                  </p>
                  {person.birth_date && (
                    <p className="text-sm text-zinc-500 mt-1">
                      Nacido el {person.birth_date}
                      {person.birth_place && ` en ${person.birth_place}`}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-zinc-500 text-center py-8">
              No hay personas registradas todavía.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}