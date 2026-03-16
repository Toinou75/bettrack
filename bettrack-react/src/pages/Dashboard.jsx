import { useEffect, useState, useMemo } from 'react';
import useUserStore from '../stores/userStore';
import useBetStore from '../stores/betStore';
import { computeStats, computeInsights } from '../utils/betLogic';
import { fmtD } from '../utils/format';
import BankrollBar from '../components/BankrollBar';
import Metrics from '../components/Metrics';
import Insights from '../components/Insights';
import Breakdowns from '../components/Breakdowns';
import BetChart from '../components/BetChart';
import BetTable from '../components/BetTable';
import BetModal from '../components/BetModal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Dashboard() {
  const { user, adjustBankroll } = useUserStore();
  const { bets, loading, fetchBets, addBet, editBet, removeBet } = useBetStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBet, setEditingBet] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    if (user?.name) fetchBets(user.name);
  }, [user?.name, fetchBets]);

  const stats = useMemo(() => computeStats(bets), [bets]);
  const insights = useMemo(() => computeInsights(bets, fmtD), [bets]);

  const handleAdd = () => { setEditingBet(null); setModalOpen(true); };
  const handleEdit = bet => { setEditingBet(bet); setModalOpen(true); };
  const handleCloseModal = () => { setModalOpen(false); setEditingBet(null); };

  const handleSubmit = async (row) => {
    if (editingBet) {
      await editBet(editingBet.id, row, editingBet, delta => adjustBankroll(delta));
    } else {
      await addBet(row, delta => adjustBankroll(delta));
    }
    handleCloseModal();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await removeBet(deleteId, user.name, delta => adjustBankroll(delta));
      setDeleteId(null);
    }
  };

  return (
    <div className="main">
      {loading && <div className="loading-bar" />}
      <BankrollBar stats={stats} />
      <Metrics stats={stats} />
      <Insights insights={insights} />
      <BetChart bets={bets} />
      <Breakdowns stats={stats} />
      <BetTable bets={bets} onAdd={handleAdd} onEdit={handleEdit} onDelete={id => setDeleteId(id)} />
      <BetModal open={modalOpen} bet={editingBet} onClose={handleCloseModal} onSubmit={handleSubmit} />
      <ConfirmDialog
        open={!!deleteId}
        title="Supprimer ce pari ?"
        message="Cette action est irréversible. La bankroll sera recalculée."
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
