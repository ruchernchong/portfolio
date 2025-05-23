import type { Project } from "@/types";

const projects: Project[] = [
  {
    name: "Singtel eShop",
    description:
      "Online e-commerce shop for mobile phones and mobile plans for Singapore's largest telecommunication company. Built with React and Gatsby. Hosted on AWS.",
    skills: [
      "gatsby",
      "react",
      "javascript",
      "typescript",
      "styled-components",
      "S3",
      "cloudfront",
    ],
    links: ["https://shop.singtel.com"],
  },
  {
    name: "Singapore Motor Trends",
    description:
      "Statistics for car trends in Singapore. Data provided by Land Transport Authority (LTA)",
    skills: ["next.js", "typescript", "react", "tailwind css", "sst", "aws"],
    links: ["https://sgmotortrends.com", "https://api.sgmotortrends.com"],
  },
  {
    name: "CPF Contribution Calculator",
    description:
      "A calculator to compute CPF contributions after the 2023 income ceiling changes following Ministry of Finance announcement at the Singapore Budget 2023",
    skills: [
      "next.js",
      "typescript",
      "react",
      "redux",
      "shadcn/ui",
      "tailwind css",
    ],
    links: ["https://cpf-contribution-calculator.ruchern.dev"],
  },
];

export default projects;
