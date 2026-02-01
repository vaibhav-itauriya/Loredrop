import { motion } from "motion/react";
import { 
  Newspaper, 
  Search, 
  Bell, 
  Heart, 
  MessageCircle, 
  Bookmark,
  Shield,
  Zap
} from "lucide-react";

const features = [
  {
    icon: Newspaper,
    title: "Social Event Feed",
    description: "Scroll through a timeline-based feed of campus events from all councils, clubs, and organizations.",
    color: "from-primary to-primary/70",
  },
  {
    icon: Search,
    title: "Smart Search",
    description: "Find events by title, tags, organization, or intended audience with real-time suggestions.",
    color: "from-accent to-accent/70",
  },
  {
    icon: Bell,
    title: "Stay Notified",
    description: "Subscribe to organizations and get notified about new events that match your interests.",
    color: "from-primary to-accent",
  },
  {
    icon: Heart,
    title: "Engage & Upvote",
    description: "Upvote events you're excited about and see what's trending in your community.",
    color: "from-accent to-primary",
  },
  {
    icon: MessageCircle,
    title: "Comment & Discuss",
    description: "Join conversations, ask questions, and connect with organizers and attendees.",
    color: "from-primary to-primary/70",
  },
  {
    icon: Bookmark,
    title: "Save for Later",
    description: "Bookmark events to your personal collection and never miss what matters to you.",
    color: "from-accent to-accent/70",
  },
  {
    icon: Shield,
    title: "Verified Organizers",
    description: "Only authorized organizations can post events, ensuring quality and authenticity.",
    color: "from-primary to-accent",
  },
  {
    icon: Zap,
    title: "Multi-Media Posts",
    description: "Events come alive with images, videos, and all the details you need.",
    color: "from-accent to-primary",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-sm font-semibold text-primary uppercase tracking-wider mb-4"
          >
            Features
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-bold tracking-tight mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Everything You Need
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            A complete platform to discover, engage with, and organize campus events
          </motion.p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative bg-card rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
            >
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
