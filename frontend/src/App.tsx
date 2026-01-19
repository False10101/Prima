import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PrimaHomepage from './PrimaHomePage';
import AuditPage from './AuditPage'; 
import RecipePage from './RecipePage'; 
import CodePage from './CodePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Extraction Point */}
        <Route path="/" element={<PrimaHomepage />} />
        
        {/* 2. Audit Room */}
        <Route path="/audit/:sessionId" element={<AuditPage />} />

        {/* 3. Recipe / Pipeline Generator */}
        <Route path="/recipe/:sessionId" element={<RecipePage />} />

        <Route path="/code/" element={<CodePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;