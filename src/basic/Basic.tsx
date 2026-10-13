import { useEffect } from "react";
import { Link } from "react-router-dom";
import "./basic.css";
import {
    EDUCATION,
    EXPERIENCE,
    PROFILE,
    PROJECTS,
    formatDate,
    hostOf,
} from "../data/portfolio";

// The "Basic" portfolio: the same projects, experience and education as
// software.nicolebelovoskey.com, as one plain black-and-white page that
// loads instantly and skims in under a minute. No images, no animation.
export const Basic: React.FC = () => {
    useEffect(() => {
        document.title = `${PROFILE.name} · Basic`;
    }, []);

    return (
        <div className="basic">
            <header>
                <h1>{PROFILE.name}</h1>
                <p className="basic__headline">Software engineer and artist</p>
                <p className="basic__links">
                    <a href={`mailto:${PROFILE.links.email}`}>{PROFILE.links.email}</a>
                    {" · "}
                    <a href={PROFILE.links.github}>GitHub</a>
                    {" · "}
                    <a href={PROFILE.links.linkedin}>LinkedIn</a>
                </p>
            </header>

            <section>
                <h2>Summary</h2>
                <p>{PROFILE.summary}</p>
            </section>

            <section>
                <h2>Experience</h2>
                <ul className="basic__list">
                    {EXPERIENCE.map((item) => (
                        <li key={item.org}>
                            <strong>{item.org}.</strong> {item.detail}
                        </li>
                    ))}
                </ul>
            </section>

            <section>
                <h2>Education</h2>
                <ul className="basic__list">
                    {EDUCATION.map((item) => (
                        <li key={item.school}>
                            <strong>{item.school}.</strong> {item.degree}
                        </li>
                    ))}
                </ul>
            </section>

            <section>
                <h2>Projects ({PROJECTS.length})</h2>
                <ol className="basic__projects">
                    {PROJECTS.map((project) => (
                        <li key={project.id}>
                            <div className="basic__row">
                                <h3>
                                    {project.url ? (
                                        <a href={project.url}>{project.title}</a>
                                    ) : (
                                        project.title
                                    )}
                                </h3>
                                <span className="basic__date">
                                    {formatDate(project.date)}
                                </span>
                            </div>
                            <p>{project.description}</p>
                            <p className="basic__meta">
                                {project.category}
                                {project.tech.length > 0 && ` · ${project.tech.join(", ")}`}
                                {project.url && (
                                    <>
                                        {" · "}
                                        <a href={project.url}>{hostOf(project.url)}</a>
                                    </>
                                )}
                                {project.source && project.source !== project.url && (
                                    <>
                                        {" · "}
                                        <a href={project.source}>source</a>
                                    </>
                                )}
                            </p>
                        </li>
                    ))}
                </ol>
            </section>

            <footer>
                <p>
                    Other ways in: <Link to="/atrium">3D world</Link>
                    {" · "}
                    <a href="https://nickeltools.dev/desktop">desktop OS</a>
                    {" · "}
                    <a href="https://software.nicolebelovoskey.com">full portfolio</a>
                    {" · "}
                    <Link to="/">all four</Link>
                </p>
            </footer>
        </div>
    );
};

export default Basic;
