import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="container narrow" style={{ textAlign: 'center' }}>
      <h1>404</h1>
      <p>That page doesn't exist.</p>
<Link to="/clubs" className="btn btn-primary">Back to Clubs</Link>    </div>
  );
}

export default NotFoundPage;