import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseKey && supabaseKey !== 'YOUR_SUPABASE_ANON_KEY');

let client = null;

if (isSupabaseConfigured) {
  try {
    client = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase Client initialized in CONNECTED mode.');
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
}

if (!client) {
  console.log('⚠️ Supabase credentials not detected. Client initialized in MOCK mode (data persists in localStorage).');

  const getStorageTable = (name) => {
    try {
      return JSON.parse(localStorage.getItem(`mock_db_${name}`) || '[]');
    } catch {
      return [];
    }
  };

  const setStorageTable = (name, data) => {
    localStorage.setItem(`mock_db_${name}`, JSON.stringify(data));
  };

  let authCallbacks = [];
  const getSessionUser = () => {
    try {
      return JSON.parse(localStorage.getItem('mock_session_user') || 'null');
    } catch {
      return null;
    }
  };

  client = {
    auth: {
      signUp: async ({ email, password, options }) => {
        await new Promise(r => setTimeout(r, 600)); // Simulate latency
        const users = getStorageTable('users');
        if (users.find(u => u.email === email)) {
          return { data: { user: null }, error: { message: 'User already exists' } };
        }
        
        const name = options?.data?.name || email.split('@')[0];
        const newUser = {
          id: crypto.randomUUID(),
          email,
          name,
          created_at: new Date().toISOString()
        };
        
        users.push(newUser);
        setStorageTable('users', users);
        
        return { data: { user: newUser }, error: null };
      },
      
      signInWithPassword: async ({ email, password }) => {
        await new Promise(r => setTimeout(r, 800)); // Simulate latency
        const users = getStorageTable('users');
        let user = users.find(u => u.email === email);

        if (!user) {
          user = {
            id: crypto.randomUUID(),
            email,
            name: email.split('@')[0],
            created_at: new Date().toISOString()
          };
          users.push(user);
          setStorageTable('users', users);
        }
        
        const session = {
          access_token: 'mock_jwt_token_' + crypto.randomUUID().replace(/-/g, ''),
          user
        };
        
        localStorage.setItem('mock_session_user', JSON.stringify(user));
        localStorage.setItem('mock_session', JSON.stringify(session));

        authCallbacks.forEach(cb => cb('SIGNED_IN', session));
        
        return { data: { user, session }, error: null };
      },
      
      signOut: async () => {
        localStorage.removeItem('mock_session_user');
        localStorage.removeItem('mock_session');
        authCallbacks.forEach(cb => cb('SIGNED_OUT', null));
        return { error: null };
      },
      
      getSession: async () => {
        const user = getSessionUser();
        if (!user) return { data: { session: null }, error: null };
        
        const session = JSON.parse(localStorage.getItem('mock_session') || '{}');
        return { data: { session: { ...session, user } }, error: null };
      },
      
      getUser: async () => {
        const user = getSessionUser();
        return { data: { user }, error: null };
      },
      
      onAuthStateChange: (callback) => {
        authCallbacks.push(callback);

        const user = getSessionUser();
        const session = JSON.parse(localStorage.getItem('mock_session') || 'null');
        if (user && session) {
          callback('SIGNED_IN', { ...session, user });
        } else {
          callback('SIGNED_OUT', null);
        }

        return {
          data: {
            subscription: {
              unsubscribe: () => {
                authCallbacks = authCallbacks.filter(cb => cb !== callback);
              }
            }
          }
        };
      }
    },

    storage: {
      from: (bucketName) => ({
        upload: async (fileName, file) => {
          await new Promise(r => setTimeout(r, 1000)); // Simulate file transfer delay
          const files = getStorageTable(`bucket_${bucketName}`);
          
          const fileId = crypto.randomUUID();
          const fileUrl = `mock://storage/${bucketName}/${fileId}/${fileName}`;
          
          files.push({
            id: fileId,
            name: fileName,
            url: fileUrl,
            uploaded_at: new Date().toISOString()
          });
          
          setStorageTable(`bucket_${bucketName}`, files);
          return { data: { path: fileName, url: fileUrl }, error: null };
        }
      })
    },

    from: (tableName) => {
      const queryBuilder = {
        select: (columns = '*') => {
          const executeSelect = () => {
            const user = getSessionUser();
            let data = getStorageTable(tableName);

            if (user) {
              if (tableName === 'documents' || tableName === 'doubts' || tableName === 'study_plans' || tableName === 'quiz_attempts' || tableName === 'user_profiles') {
                data = data.filter(row => row.user_id === user.id);
              } else if (tableName === 'notes' || tableName === 'quizzes' || tableName === 'flashcards') {

                const documents = getStorageTable('documents').filter(doc => doc.user_id === user.id);
                const ownDocIds = documents.map(d => d.id);
                data = data.filter(row => ownDocIds.includes(row.document_id));
              } else if (tableName === 'users') {
                data = data.filter(row => row.id === user.id);
              }
            }
            return data;
          };
          
          const chain = {
            eq: (col, val) => {
              const rows = executeSelect().filter(row => row[col] === val);
              
              const subChain = {
                single: () => {
                  if (rows.length === 0) return Promise.resolve({ data: null, error: { message: 'Row not found' } });
                  return Promise.resolve({ data: rows[0], error: null });
                },
                then: (resolve) => resolve({ data: rows, error: null })
              };
              return subChain;
            },
            order: (col, { ascending = true } = {}) => {
              const rows = [...executeSelect()].sort((a, b) => {
                if (a[col] < b[col]) return ascending ? -1 : 1;
                if (a[col] > b[col]) return ascending ? 1 : -1;
                return 0;
              });
              
              return {
                then: (resolve) => resolve({ data: rows, error: null })
              };
            },
            single: () => {
              const rows = executeSelect();
              if (rows.length === 0) return Promise.resolve({ data: null, error: { message: 'Row not found' } });
              return Promise.resolve({ data: rows[0], error: null });
            },
            then: (resolve) => resolve({ data: executeSelect(), error: null })
          };
          
          return chain;
        },
        
        insert: (rows) => {
          const arr = Array.isArray(rows) ? rows : [rows];
          const dbRows = arr.map(row => ({
            id: row.id || crypto.randomUUID(),
            created_at: new Date().toISOString(),
            uploaded_at: new Date().toISOString(),
            ...row
          }));
          
          const currentData = getStorageTable(tableName);
          const updated = [...currentData, ...dbRows];
          setStorageTable(tableName, updated);
          
          const chain = {
            select: () => ({
              single: () => Promise.resolve({ data: dbRows[0], error: null }),
              then: (resolve) => resolve({ data: dbRows, error: null })
            }),
            then: (resolve) => resolve({ data: dbRows, error: null })
          };
          return chain;
        },
        
        update: (updates) => {
          return {
            eq: (col, val) => {
              const currentData = getStorageTable(tableName);
              let changedRows = [];
              
              const updated = currentData.map(row => {
                if (row[col] === val) {
                  const updatedRow = { ...row, ...updates };
                  changedRows.push(updatedRow);
                  return updatedRow;
                }
                return row;
              });
              
              setStorageTable(tableName, updated);
              return Promise.resolve({ data: changedRows, error: null });
            }
          };
        },
        
        delete: () => {
          return {
            eq: (col, val) => {
              const currentData = getStorageTable(tableName);
              const remaining = currentData.filter(row => row[col] !== val);
              setStorageTable(tableName, remaining);
              return Promise.resolve({ data: null, error: null });
            }
          };
        }
      };
      return queryBuilder;
    }
  };
}

export const supabase = client;
export default supabase;
