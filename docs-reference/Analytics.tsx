import { trpc } from "@/lib/trpc";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, DollarSign, Package, Award, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToExcel, exportToCSV } from "@/lib/export";
import { toast } from "sonner";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Analytics() {
  const handleExportExcel = async () => {
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.default.Workbook();

      const allData = {
        'Tender Stats': tenderStats ? [tenderStats] : [],
        'Tender Trends': tenderTrends || [],
        'Revenue Stats': revenueStats ? [revenueStats] : [],
        'Revenue Trends': revenueTrends || [],
        'Expense Breakdown': expenseBreakdown || [],
        'Expense Trends': expenseTrends || [],
      };

      Object.entries(allData).forEach(([sheetName, data]) => {
        const worksheet = workbook.addWorksheet(sheetName);
        if (Array.isArray(data) && data.length > 0) {
          const headers = Object.keys(data[0]);
          worksheet.addRow(headers);
          data.forEach(item => {
            worksheet.addRow(headers.map(header => (item as Record<string, unknown>)[header]));
          });
          worksheet.getRow(1).font = { bold: true };
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics-${new Date().toISOString().split('T')[0]}.xlsx`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Analytics data exported to Excel');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };
  
  const handleExportCSV = () => {
    try {
      const combinedData = [
        { Section: 'Tender Stats', Data: JSON.stringify(tenderStats) },
        { Section: 'Revenue Stats', Data: JSON.stringify(revenueStats) },
      ];
      
      exportToCSV(combinedData, `analytics-${new Date().toISOString().split('T')[0]}`);
      toast.success('Analytics data exported to CSV');
    } catch (error) {
      toast.error('Failed to export data');