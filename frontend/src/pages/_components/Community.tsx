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
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-sm font-semibold text-primary uppercase tracking-wider mb-4"
          >
            Community
          </motion.p>
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

        {/* Organizations Marquee */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
          
          <motion.div
            className="flex gap-4 py-4"
            animate={{ x: [0, -1000] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            {[...organizations, ...organizations].map((org, index) => (
              <div
                key={`${org.name}-${index}`}
                className="flex-shrink-0 px-6 py-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors"
              >
                <p className="font-semibold whitespace-nowrap" style={{ fontFamily: "var(--font-display)" }}>
                  {org.name}
                </p>
                <p className="text-sm text-muted-foreground">{org.type}</p>
              </div>
            ))}
          </motion.div>
        </div>

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
              src="https://images.unsplash.com/photo-1611373099245-5ce76dcdac4c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NzIwMTN8MHwxfHNlYXJjaHw0fHx1bml2ZXJzaXR5JTIwc3R1ZGVudHMlMjBjb21tdW5pdHklMjBmZXN0aXZhbCUyMG91dGRvb3J8ZW58MHx8fHwxNzY4NzUyNDU4fDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Students on campus"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="rounded-2xl overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1744232255607-cad8c181b221?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NzIwMTN8MHwxfHNlYXJjaHw2fHx1bml2ZXJzaXR5JTIwc3R1ZGVudHMlMjBjb21tdW5pdHklMjBmZXN0aXZhbCUyMG91dGRvb3J8ZW58MHx8fHwxNzY4NzUyNDU4fDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Festival crowd"
              className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="rounded-2xl overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1549630552-4cfaf858cb03?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NzIwMTN8MHwxfHNlYXJjaHw1fHx1bml2ZXJzaXR5JTIwc3R1ZGVudHMlMjBjb21tdW5pdHklMjBmZXN0aXZhbCUyMG91dGRvb3J8ZW58MHx8fHwxNzY4NzUyNDU4fDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Campus aerial view"
              className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="rounded-2xl overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1633701945987-d21c145a07b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NzIwMTN8MHwxfHNlYXJjaHwxMHx8dW5pdmVyc2l0eSUyMHN0dWRlbnRzJTIwY29tbXVuaXR5JTIwZmVzdGl2YWwlMjBvdXRkb29yfGVufDB8fHx8MTc2ODc1MjQ1OHww&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Students sitting"
              className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="rounded-2xl overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1762158007836-25d13ab34c1c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NzIwMTN8MHwxfHNlYXJjaHwxMHx8Y29sbGVnZSUyMGNhbXB1cyUyMGV2ZW50JTIwc3R1ZGVudHMlMjBnYXRoZXJpbmclMjBjZWxlYnJhdGlvbnxlbnwwfHx8fDE3Njg3NTI0NTh8MA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Students in chairs"
              className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
