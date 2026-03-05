import { useEffect, useRef } from 'react'
import './App.css'

/* ─── Circuit background ─── */
function CircuitCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    let raf = 0

    const nodes: { x: number; y: number; ox: number; oy: number; vx: number; vy: number; r: number; pulse: number; speed: number }[] = []
    const particles: { x: number; y: number; progress: number; speed: number; from: number; to: number }[] = []
    const mouse = { x: canvas.width / 2, y: canvas.height / 2, active: false }

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = document.documentElement.scrollHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY + window.scrollY
      mouse.active = true
    }
    const onMouseLeave = () => {
      mouse.active = false
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseleave', onMouseLeave)

    const count = Math.floor((canvas.width * canvas.height) / 8000)
    for (let i = 0; i < count; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      nodes.push({
        x,
        y,
        ox: x,
        oy: y,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2.5 + 1.5,
        pulse: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.015 + 0.008,
      })
    }

    function spawnParticle() {
      if (nodes.length < 2) return
      const from = Math.floor(Math.random() * nodes.length)
      let to = Math.floor(Math.random() * nodes.length)
      if (to === from) to = (to + 1) % nodes.length
      const a = nodes[from], b = nodes[to]
      if (Math.hypot(a.x - b.x, a.y - b.y) < 300) {
        particles.push({ x: a.x, y: a.y, progress: 0, speed: 0.008 + Math.random() * 0.012, from, to })
      }
    }

    let tick = 0
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      tick++
      if (tick % 4 === 0) spawnParticle()

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy)

          // hard anti-overlap: keep node circles from intersecting
          const minGap = a.r + b.r + 1.5
          if (dist > 0 && dist < minGap) {
            const nx = dx / dist
            const ny = dy / dist
            const overlap = (minGap - dist) * 0.5

            a.x += nx * overlap
            a.y += ny * overlap
            b.x -= nx * overlap
            b.y -= ny * overlap

            const repel = (minGap - dist) * 0.04
            a.vx += nx * repel
            a.vy += ny * repel
            b.vx -= nx * repel
            b.vy -= ny * repel
          }

          if (dist < 260) {
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(140, 160, 185, ${(1 - dist / 260) * 0.15})`
            ctx.lineWidth = 0.7
            ctx.stroke()
          }
        }
      }

      // only one node can be pulled at a time: nearest node in short range
      let pulledNodeIndex = -1
      let nearestDist = Infinity
      if (mouse.active) {
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i]
          const dist = Math.hypot(mouse.x - n.x, mouse.y - n.y)
          if (dist < 65 && dist < nearestDist) {
            nearestDist = dist
            pulledNodeIndex = i
          }
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]

        // ambient motion so background never feels static
        n.vx += Math.sin(n.pulse * 0.7) * 0.006
        n.vy += Math.cos(n.pulse * 0.9) * 0.006

        // elastic pull on only one node
        if (i === pulledNodeIndex) {
          const dx = mouse.x - n.x
          const dy = mouse.y - n.y
          const dist = Math.hypot(dx, dy)
          if (dist > 0) {
            const t = 1 - dist / 65
            const force = Math.max(0, t) * 0.12
            n.vx += (dx / dist) * force
            n.vy += (dy / dist) * force
          }
        }

        // spring back toward original position (stronger when mouse not pulling)
        const spring = mouse.active ? 0.004 : 0.006
        n.vx += (n.ox - n.x) * spring
        n.vy += (n.oy - n.y) * spring

        n.vx *= 0.95
        n.vy *= 0.95
        n.vx = Math.max(-1.2, Math.min(1.2, n.vx))
        n.vy = Math.max(-1.2, Math.min(1.2, n.vy))

        n.x += n.vx; n.y += n.vy; n.pulse += n.speed
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1

        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(150, 170, 200, ${0.35 + Math.sin(n.pulse) * 0.2})`
        ctx.fill()
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        const a = nodes[p.from], b = nodes[p.to]
        p.progress += p.speed
        if (p.progress >= 1) { particles.splice(i, 1); continue }
        const px = a.x + (b.x - a.x) * p.progress
        const py = a.y + (b.y - a.y) * p.progress
        ctx.beginPath()
        ctx.arc(px, py, 1.8, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(120, 160, 220, ${0.6 - p.progress * 0.4})`
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  return <canvas ref={ref} className="circuit-canvas" />
}

/* ─── Icons ─── */
function GitHubIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3H3v10h10V9" />
      <path d="M10 2h4v4" />
      <path d="M8 8L14 2" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 4L12 13 2 4" />
    </svg>
  )
}

/* ─── Data ─── */
const PROJECTS = [
  {
    name: 'LiDARNet',
    description: 'A UNet-based approach to improving LiDAR performance in adversarial weather conditions — denoising and reconstructing occluded sensor maps using diffusion techniques.',
    tag: 'Research Paper',
    tagColor: '#e8913a',
    github: null as string | null,
    site: 'https://docs.google.com/document/d/1btrzMTH2v4CsBZbrchpGNVu5UM2K4o_DayboqmGMng8/edit?usp=sharing',
    badge: 'Undergoing submission to jsr.org',
  },
  {
    name: 'GridWorld RL',
    description: 'Training a reinforcement learning model to navigate a 15×15 grid using PyTorch — exploring Q-learning and policy optimization in a discrete environment.',
    tag: 'Python',
    tagColor: '#3572A5',
    github: 'https://github.com/XytheRoblox/GridWorld-RL',
    site: null as string | null,
    badge: null as string | null,
  },
  {
    name: 'Ruduz',
    description: 'An unreleased multiplayer server hosting platform for Minecraft — full-stack web app with real-time server provisioning and management.',
    tag: 'JavaScript',
    tagColor: '#f1e05a',
    github: 'https://github.com/XytheRoblox/ruduz-io',
    site: null as string | null,
    badge: null as string | null,
  },
]

const SKILLS = [
  { label: 'Python', img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg', url: 'https://python.org' },
  { label: 'PyTorch', img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pytorch/pytorch-original.svg', url: 'https://pytorch.org' },
  { label: 'TensorFlow', img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg', url: 'https://tensorflow.org' },
  { label: 'OpenCV', img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/opencv/opencv-original.svg', url: 'https://opencv.org' },
  { label: 'NumPy', img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/numpy/numpy-original.svg', url: 'https://numpy.org' },
  { label: 'scikit-learn', img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/scikitlearn/scikitlearn-original.svg', url: 'https://scikit-learn.org' },
  { label: 'JavaScript', img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript' },
  { label: 'Node.js', img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg', url: 'https://nodejs.org' },
  { label: 'HTML / CSS', img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML' },
  { label: 'Git', img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg', url: 'https://git-scm.com' },
  { label: 'Linux', img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linux/linux-original.svg', url: 'https://kernel.org' },
  { label: 'Raspberry Pi', img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/raspberrypi/raspberrypi-original.svg', url: 'https://raspberrypi.com' },
]

function ProjectCard({ project }: { project: typeof PROJECTS[0] }) {
  return (
    <div className="project-card">
      <div className="card-body">
        <h3>{project.name}</h3>
        {project.badge && <span className="card-badge">{project.badge}</span>}
        <p>{project.description}</p>
        <span className="lang-tag">
          <span className="lang-dot" style={{ background: project.tagColor }} />
          {project.tag}
        </span>
      </div>
      <div className="card-buttons">
        {project.github && (
          <a className="card-btn" href={project.github} target="_blank" rel="noreferrer">
            <GitHubIcon /> Code
          </a>
        )}
        {project.site && (
          <a className="card-btn" href={project.site} target="_blank" rel="noreferrer">
            <ExternalIcon /> Read Paper
          </a>
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <>
      <CircuitCanvas />
      <div className="glow glow-a" />
      <div className="glow glow-b" />

      <main className="container">
        {/* Hero */}
        <section className="hero">
          <h1 className="typewriter">Ishaan Srinivasan</h1>
          <p className="bio">
            Ishaan Srinivasan is a high school student learning and exploring the
            boundaries of artificial intelligence, software engineering, and embedded systems.
          </p>
        </section>

        {/* Projects */}
        <section className="section">
          <h2 className="section-title">Projects</h2>
          <div className="projects-row">
            {PROJECTS.map((p) => (
              <ProjectCard key={p.name} project={p} />
            ))}
          </div>
        </section>

        {/* Skills */}
        <section className="section">
          <h2 className="section-title">Skills & Tools</h2>
          <div className="skills-grid">
            {SKILLS.map((s) => (
              <a key={s.label} className="skill-chip" href={s.url} target="_blank" rel="noreferrer">
                <img className="skill-icon" src={s.img} alt={s.label} />
                {s.label}
              </a>
            ))}
          </div>
        </section>

        {/* Currently */}
        <section className="section">
          <h2 className="section-title">Status</h2>
          <div className="currently-card">
            <div className="currently-item">
              <span className="pulse-dot" />
              <span>Seeking research opportunities and mentorship</span>
            </div>
            <div className="currently-item">
              <span className="pulse-dot" />
              <span>Competed at GARSEF 2026</span>
            </div>
            <div className="currently-item">
              <span className="pulse-dot" />
              <span>Scouting for FRC team 2468</span>
            </div>
          </div>
        </section>

        {/* Footer / Contact */}
        <footer className="footer">
          <div className="footer-links">
            <a href="https://github.com/XytheRoblox" target="_blank" rel="noreferrer" className="footer-link">
              <GitHubIcon size={18} /> GitHub
            </a>
            <a href="mailto:ishaan.srinivasan@gmail.com" className="footer-link">
              <MailIcon /> Contact
            </a>
          </div>
          <p className="footer-copy">© {new Date().getFullYear()} Ishaan Srinivasan</p>
        </footer>
      </main>
    </>
  )
}
