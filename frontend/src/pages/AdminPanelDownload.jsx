import "../App.css";
import { Link } from "react-router-dom";
import Header from "../components/header/Header";

export default function AdminPanelDownload({ isLoggedIn, setIsLoggedIn }) {
  const downloadUrl = "/FullAdminPanel.zip";
  const downloadFileName = "FullAdminPanel.zip";

  function handleDownload() {
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div>
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      <div className="mx-auto col-12 sb-page">
      <div className="admin-panel-page">
        <h1>Admin Panel – Download &amp; Installation</h1>
        <p className="admin-panel-intro">
          Here you can download the SkillBuddies Admin Panel (Windows desktop app) and follow the installation steps. Only visible to admins and owners.
        </p>

        <section className="admin-panel-section">
          <h2>1. Download</h2>
          <p>Download the zip containing the Admin Panel application and project files.</p>
          <button type="button" className="sb-join" onClick={handleDownload}>
            Download Admin Panel (ZIP)
          </button>
        </section>

        <section className="admin-panel-section">
          <h2>2. Installation steps</h2>
          <ol className="admin-panel-steps">
            <li>Extract the downloaded <strong>{downloadFileName}</strong> to a folder (e.g. <code>Desktop\AdminPanel</code>).</li>
            <li>Open the solution in <strong>Visual Studio</strong>: open the <code>.sln</code> file inside the extracted folder.</li>
            <li>Restore NuGet packages (Visual Studio usually does this automatically).</li>
            <li>Configure the app to use your backend: set the API base URL in the app settings if needed (e.g. <code>http://localhost:3001</code>).</li>
            <li>Run the project (F5 or Start). Log in with an <strong>admin or owner</strong> account to use admin features.</li>
          </ol>
        </section>

        <section className="admin-panel-section">
          <h2>3. Test accounts (after importing DataSet.sql)</h2>
          <p>Use these accounts to try the site and the admin panel:</p>
          <ul>
            <li><strong>Admin / Owner:</strong> e.g. <code>admin@skillbuddies.test</code> or <code>novesz831@hengersor.hu</code> (password in team docs).</li>
            <li><strong>Demo user (password: <code>password</code>):</strong> <code>demo@skillbuddies.test</code>, <code>member@skillbuddies.test</code>.</li>
          </ul>
        </section>

        <p className="admin-panel-back">
          <Link to="/">Back to home</Link>
        </p>
      </div>
    </div>
    </div>
  );
}
