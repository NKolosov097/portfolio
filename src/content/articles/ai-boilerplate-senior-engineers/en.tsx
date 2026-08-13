export const AiBoilerplateSeniorEngineersEn = () => (
  <>
    <p>
      Ninety percent of developers now use an AI coding assistant regularly. Copilot, Cursor,
      Claude Code — pick one, and it will write you a working component in seconds. A form with
      validation. A CRUD screen. A data table with sorting. Code that compiles, passes the linter,
      and looks like something a human wrote.
    </p>

    <p>None of that means it&apos;s ready to ship.</p>

    <p>
      There&apos;s a gap between &ldquo;the code runs&rdquo; and &ldquo;the product survives
      production,&rdquo; and in 2026 that gap is exactly where the job of a senior engineer lives.
      AI closed the distance on typing code. It didn&apos;t close the distance on owning it.
    </p>

    <h2 id="what-ai-actually-closes-well">What AI Actually Closes Well</h2>

    <p>
      Worth saying plainly: AI is genuinely good at boilerplate, and pretending otherwise wastes
      everyone&apos;s time. Scaffolding a new route, wiring a form to a schema, generating a test
      skeleton, translating a Figma layout into markup — these are pattern-matching tasks, and
      pattern-matching is what large models do best. If a task has been solved the same way a
      thousand times on GitHub, an AI assistant will solve it for you in seconds, and it should.
    </p>

    <p>
      The failure mode isn&apos;t using AI for this. It&apos;s treating everything else as if it
      worked the same way.
    </p>

    <h2 id="three-decisions-ai-wont-make-for-you">Three Decisions AI Won&apos;t Make for You</h2>

    <p>
      <strong>1. Rendering strategy, not just rendering code.</strong> On a real-time product I
      worked on — video and audio streaming in the browser — the question was never &ldquo;can you
      render this component.&rdquo; It was <em>when</em>: does this piece hydrate before the media
      connection opens, or after? Get it backwards and you either block the user on JavaScript
      that doesn&apos;t matter yet, or you let them click &ldquo;join&rdquo; before the stream is
      actually ready to receive input. An AI assistant will happily generate a component that
      renders correctly in isolation. It has no opinion on where that component sits in your
      connection lifecycle, because that opinion depends on your architecture, not your syntax.
    </p>

    <p>
      <strong>2. Where the weight goes.</strong> Bundle-splitting and offloading work to a Web
      Worker both &ldquo;work&rdquo; almost anywhere you put them — that&apos;s what makes them
      dangerous to delegate. AI will suggest a lazy-loaded chunk boundary that&apos;s syntactically
      fine and practically wrong: splitting at a point that still blocks first paint, or moving
      computation to a worker that then has to serialize a payload so large the postMessage cost
      erases the benefit. Judging that trade-off means knowing your actual traffic shape, your
      device targets, your performance budget — context that lives in your team&apos;s dashboards,
      not in the prompt.
    </p>

    <p>
      <strong>3. What deserves a test, and what a passing test actually proves.</strong> Ask an AI
      assistant to write tests for a component and it will write tests — for the happy path,
      matching whatever the component currently does. That&apos;s the trap: it tests the
      implementation, not the requirement. On the same real-time product, the tests that mattered
      weren&apos;t &ldquo;does the button render&rdquo; — they were &ldquo;does the UI recover
      correctly when the connection drops mid-call&rdquo; and &ldquo;does the reconnect logic race
      against a user who already closed the tab.&rdquo; Nobody generates that test by
      pattern-matching the codebase, because the failure case isn&apos;t in the codebase yet.
      Deciding what should break the build is a judgment call about risk, and judgment calls are
      the one thing you can&apos;t outsource to autocomplete.
    </p>

    <h2 id="the-real-skill-gap-is-direction-not-typing">
      The Real Skill Gap Is Direction, Not Typing
    </h2>

    <p>
      Put these three together and a pattern shows up: none of them are about writing code
      faster. They&apos;re about deciding what the code is for before a single line exists. AI
      collapses the distance between &ldquo;I know what I want&rdquo; and &ldquo;it&apos;s
      written.&rdquo; It does nothing to help you figure out what you want in the first place —
      and in a system with real-time constraints, real users, and real failure modes, that&apos;s
      most of the job.
    </p>

    <p>
      This is also the cleanest way to tell candidates apart in an interview. Anyone can now
      produce a working component on request — that stopped being a signal the moment AI
      assistants got good. What still separates a senior hire from a junior one is whether they
      can look at generated code and say why it&apos;s wrong for this system, or whether they ship
      whatever came back from the prompt because it passed CI. One of those people is directing a
      tool. The other is hoping it&apos;s right.
    </p>

    <p>
      If you&apos;re hiring for &ldquo;AI-native&rdquo; engineers, that&apos;s the question worth
      asking in the interview — not &ldquo;do you use Copilot,&rdquo; but &ldquo;show me a time an
      AI suggestion was reasonable and still wrong.&rdquo; The answer tells you whether you&apos;re
      looking at ownership or autocomplete with a job title.
    </p>

    <p>
      AI didn&apos;t make senior engineers less necessary. It just made the necessary part more
      visible.
    </p>
  </>
)

export default AiBoilerplateSeniorEngineersEn
