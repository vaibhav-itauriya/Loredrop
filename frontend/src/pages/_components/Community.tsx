import { motion } from "motion/react";

const organizations = [
  { name: "Students' Gymkhana", type: "Council" },
  { name: "Techkriti", type: "Festival" },
  { name: "Antaragni", type: "Festival" },
  { name: "E-Cell", type: "Club" },
  { name: "Programming Club", type: "Club" },
  { name: "Robotics Club", type: "Club" },
  { name: "Film & Media Council", type: "Council" },
  { name: "Cultural Council", type: "Council" },
];

export default function Community() {
  return (
    <section id="community" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-bold tracking-tight mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Powered by IITK Community
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Events from councils, clubs, and organizations across the campus
          </motion.p>
        </div>

      </div>

      {/* Organizations Marquee - Full Screen Width */}
      <div className="relative z-10 w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
        <motion.div
          className="flex w-max py-4"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        >
          {[...organizations, ...organizations, ...organizations, ...organizations].map((org, index) => (
            <div key={`${org.name}-${index}`} className="pr-4">
              <div className="flex-shrink-0 px-6 py-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors cursor-default">
                <p className="font-semibold whitespace-nowrap" style={{ fontFamily: "var(--font-display)" }}>
                  {org.name}
                </p>
                <p className="text-sm text-muted-foreground">{org.type}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Image Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="col-span-2 row-span-2 rounded-2xl overflow-hidden">
            <img
              src="/assets/students-gymkhana.jpg"
              alt="Students on campus"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="rounded-2xl overflow-hidden">
            <img
              src="/assets/placement.jpg"
              alt="Festival crowd"
              className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="rounded-2xl overflow-hidden">
            <img
              src="/assets/internship.JPG"
              alt="Campus aerial view"
              className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="rounded-2xl overflow-hidden">
            <img
              src="/assets/dosa.jpg"
              alt="Students sitting"
              className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="rounded-2xl overflow-hidden">
            <img
              src="/assets/dord (1).jpg"
              alt="Students in chairs"
              className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
