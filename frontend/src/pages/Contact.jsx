import PageTitle from "../components/PageTitle";

import "./Legal.css";

function Contact() {
  return (
    <main className="legal-page">
      <PageTitle title="Contact" />

      <div className="legal-container">

        <h1>Contactez-nous</h1>

        <p>
          Une question, un problème, une suggestion ? N'hésitez
          pas à nous écrire, nous répondons rapidement.
        </p>

        <div className="legal-contact-grid">

          <div className="legal-contact-card">
            <span>📧</span>
            <strong>Par email</strong>
            <a href="mailto:assemg100@gmail.com">
              assemg100@gmail.com
            </a>
          </div>

          <div className="legal-contact-card">
            <span>📍</span>
            <strong>Basé au Sénégal</strong>
            Dakar, Sénégal
          </div>

        </div>

      </div>
    </main>
  );
}

export default Contact;
